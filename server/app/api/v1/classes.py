from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
from datetime import timedelta, datetime, timezone
import secrets
import logging

logger = logging.getLogger(__name__)

from app.db.session import get_db
from app.models import Class, ClassEnrollment, Course, TeacherProfile, StudentProfile, User, UserRole, GuestSession
from app.schemas import ClassCreate, ClassUpdate, ClassResponse, GuestJoinRequest
from app.api.v1.auth import get_current_user
from app.models import User as UserModel
from app.core.security import create_access_token
from app.services.membership import FEATURE_CLASS_STUDENTS, FEATURE_CREATE_CLASS, assert_teacher_feature_access
from app.services.activity_logger import log_activity
from app.models import ActivityType

router = APIRouter(prefix="/classes", tags=["Classes"])


class JoinClassRequest(BaseModel):
    invite_code: str


GUEST_TOKEN_EXPIRE_HOURS = 2


@router.post("/guest-join")
async def guest_join(
    data: GuestJoinRequest,
    db: AsyncSession = Depends(get_db),
):
    """Join a class as a guest student (no account required). Creates a temporary 2-hour account."""
    # Find class by invite code
    result = await db.execute(select(Class).where(Class.invite_code == data.invite_code.upper()))
    class_obj = result.scalar_one_or_none()

    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found with this invite code",
        )

    # Clean up expired guests before checking capacity
    await cleanup_expired_guests(db, class_obj.id)

    await assert_teacher_feature_access(db, class_obj.teacher_id, FEATURE_CLASS_STUDENTS, class_id=class_obj.id)

    # Create guest user (no email, no password)
    user = User(
        name=data.name,
        role=UserRole.STUDENT,
        is_guest=True,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # Create student profile
    profile = StudentProfile(user_id=user.id)
    db.add(profile)

    # Create guest session (2 hours from now)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=GUEST_TOKEN_EXPIRE_HOURS)
    guest_session = GuestSession(
        user_id=user.id,
        student_id_number=data.student_id_number,
        name=data.name,
        expires_at=expires_at,
    )
    db.add(guest_session)

    # Enroll in class
    enrollment = ClassEnrollment(
        class_id=class_obj.id,
        student_id=user.id,
        status="active",
    )
    db.add(enrollment)

    await db.commit()
    await db.refresh(user)

    # Create access token (2 hours)
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role.value, "is_guest": True},
        expires_delta=timedelta(hours=GUEST_TOKEN_EXPIRE_HOURS),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_at": expires_at.isoformat(),
        "user": {
            "id": user.id,
            "name": user.name,
            "role": user.role.value,
            "is_guest": True,
        },
        "class": {
            "id": class_obj.id,
            "name": class_obj.name,
            "invite_code": class_obj.invite_code,
        },
    }


from sqlalchemy.orm import selectinload, joinedload
from datetime import datetime, timezone


async def cleanup_expired_guests(db: AsyncSession, class_id: str) -> int:
    """Clean up expired guest enrollments for a specific class. Returns count of cleaned guests."""
    # Find all guest enrollments in this class
    result = await db.execute(
        select(ClassEnrollment, User, GuestSession)
        .join(User, ClassEnrollment.student_id == User.id)
        .join(GuestSession, GuestSession.user_id == User.id)
        .where(
            ClassEnrollment.class_id == class_id,
            User.is_guest == True
        )
    )
    guest_enrollments = result.all()

    now = datetime.now(timezone.utc)
    cleaned_count = 0

    for enrollment, user, guest_session in guest_enrollments:
        if guest_session.expires_at < now:
            # Only remove the active class occupancy and guest session.
            # Historical learning records stay intact to avoid breaking FK chains.
            await db.delete(enrollment)
            await db.delete(guest_session)
            user.is_active = False
            cleaned_count += 1

    if cleaned_count > 0:
        await db.commit()
        logger.info(f"Cleaned up {cleaned_count} expired guest(s) from class {class_id}")

    return cleaned_count


@router.get("", response_model=List[ClassResponse])
async def get_classes(
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all classes for the current user."""
    try:
        if current_user.role == UserRole.TEACHER:
            # Get teacher profile
            result = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
            teacher = result.scalar_one_or_none()

            if not teacher:
                return []

            result = await db.execute(
                select(Class)
                .options(
                    joinedload(Class.teacher).joinedload(TeacherProfile.user),
                    joinedload(Class.enrollments)
                )
                .where(Class.teacher_id == teacher.user_id)
            )
            classes = result.unique().scalars().all()

            # Clean up expired guests for each class
            for class_obj in classes:
                await cleanup_expired_guests(db, class_obj.id)
        else:
            # Student - get enrolled classes
            result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
            student = result.scalar_one_or_none()

            if not student:
                return []

            # First get enrolled class IDs
            result = await db.execute(
                select(ClassEnrollment.class_id)
                .where(ClassEnrollment.student_id == student.user_id)
            )
            class_ids = [row[0] for row in result.all()]

            if not class_ids:
                return []

            # Then fetch classes with relationships
            result = await db.execute(
                select(Class)
                .options(
                    joinedload(Class.teacher).joinedload(TeacherProfile.user),
                    joinedload(Class.enrollments)
                )
                .where(Class.id.in_(class_ids))
            )
            classes = result.unique().scalars().all()

            # Clean up expired guests for each class
            for class_obj in classes:
                await cleanup_expired_guests(db, class_obj.id)

        return [
            {
                "id": c.id,
                "course_id": c.course_id,
                "teacher_id": c.teacher_id,
                "name": c.name,
                "invite_code": c.invite_code,
                "status": c.status,
                "start_time": c.start_time,
                "created_at": c.created_at,
                "teacher": {
                    "id": c.teacher.user.id,
                    "name": c.teacher.user.name,
                } if c.teacher and c.teacher.user else None,
                "student_count": len([e for e in c.enrollments if e.status == "active"]) if c.enrollments else 0,
            }
            for c in classes
        ]
    except Exception as e:
        logger.error(f"Error in get_classes: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.post("", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
async def create_class(
    class_data: ClassCreate,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new class (teachers only)."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can create classes",
        )

    # Get teacher profile
    result = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher profile not found",
        )

    await assert_teacher_feature_access(db, teacher.user_id, FEATURE_CREATE_CLASS)

    # Generate invite code if not provided
    invite_code = class_data.invite_code or secrets.token_hex(4).upper()

    # Create class
    try:
        new_class = Class(
            course_id=class_data.course_id,
            teacher_id=teacher.user_id,
            name=class_data.name,
            invite_code=invite_code,
            start_time=class_data.start_time,
        )

        db.add(new_class)
        await db.commit()
        await db.refresh(new_class)

        await log_activity(db, teacher.user_id, ActivityType.CREATE_CLASS, f"创建班级「{new_class.name}」", entity_type="class", entity_id=new_class.id)

        return {
            "id": new_class.id,
            "course_id": new_class.course_id,
            "teacher_id": new_class.teacher_id,
            "name": new_class.name,
            "invite_code": new_class.invite_code,
            "status": new_class.status,
            "start_time": new_class.start_time,
            "created_at": new_class.created_at,
        }
    except Exception as e:
        logger.error(f"Failed to create class: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create class: {str(e)}",
        )


@router.get("/{class_id}", response_model=ClassResponse)
async def get_class(
    class_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific class by ID."""
    # Clean up expired guests before returning class data
    await cleanup_expired_guests(db, class_id)

    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()

    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found",
        )

    # Check permission
    if current_user.role == UserRole.STUDENT:
        # Check if student is enrolled
        result = await db.execute(
            select(ClassEnrollment).where(
                ClassEnrollment.class_id == class_id,
                ClassEnrollment.student_id == current_user.id,
            )
        )
        enrollment = result.scalar_one_or_none()

        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in this class",
            )

    return {
        "id": class_obj.id,
        "course_id": class_obj.course_id,
        "teacher_id": class_obj.teacher_id,
        "name": class_obj.name,
        "invite_code": class_obj.invite_code,
        "status": class_obj.status,
        "start_time": class_obj.start_time,
        "created_at": class_obj.created_at,
    }


@router.patch("/{class_id}", response_model=ClassResponse)
async def update_class(
    class_id: str,
    class_data: ClassUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a class (teachers only)."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can update classes",
        )

    # Get teacher profile
    result = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher profile not found",
        )

    # Get class
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()

    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found",
        )

    # Check ownership
    if class_obj.teacher_id != teacher.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this class",
        )

    # Update fields
    if class_data.name is not None:
        class_obj.name = class_data.name
    if class_data.status is not None:
        class_obj.status = class_data.status

    await db.commit()
    await db.refresh(class_obj)

    return {
        "id": class_obj.id,
        "course_id": class_obj.course_id,
        "teacher_id": class_obj.teacher_id,
        "name": class_obj.name,
        "invite_code": class_obj.invite_code,
        "status": class_obj.status,
        "start_time": class_obj.start_time,
        "created_at": class_obj.created_at,
    }


@router.delete("/{class_id}")
async def delete_class(
    class_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a class (teachers only)."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can delete classes",
        )

    # Get teacher profile
    result = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher profile not found",
        )

    # Get class
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()

    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found",
        )

    # Check ownership
    if class_obj.teacher_id != teacher.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this class",
        )

    await db.delete(class_obj)
    await db.commit()

    return {"message": "Class deleted successfully"}


@router.post("/join", response_model=ClassResponse)
async def join_class(
    data: JoinClassRequest,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Join a class using invite code (students only)."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can join classes",
        )

    # Find class by invite code
    result = await db.execute(select(Class).where(Class.invite_code == data.invite_code.upper()))
    class_obj = result.scalar_one_or_none()

    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found with this invite code",
        )

    # Clean up expired guests before checking capacity
    await cleanup_expired_guests(db, class_obj.id)

    # Get student profile
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )

    # Check if already enrolled
    existing = await db.execute(
        select(ClassEnrollment).where(
            ClassEnrollment.class_id == class_obj.id,
            ClassEnrollment.student_id == student.user_id,
        )
    )
    if existing.scalar_one_or_none():
        # Idempotent: return class info if already enrolled
        return {
            "id": class_obj.id,
            "course_id": class_obj.course_id,
            "teacher_id": class_obj.teacher_id,
            "name": class_obj.name,
            "invite_code": class_obj.invite_code,
            "status": class_obj.status,
            "start_time": class_obj.start_time,
            "created_at": class_obj.created_at,
        }

    await assert_teacher_feature_access(db, class_obj.teacher_id, FEATURE_CLASS_STUDENTS, class_id=class_obj.id)

    # Create enrollment
    enrollment = ClassEnrollment(
        class_id=class_obj.id,
        student_id=student.user_id,
    )

    db.add(enrollment)
    await db.commit()
    await db.refresh(class_obj)

    # Notify the teacher about the new student
    from app.services.notifications import create_notification
    from app.models import NotificationType

    await create_notification(
        db=db,
        user_id=class_obj.teacher_id,
        type=NotificationType.NEW_STUDENT_JOINED,
        title=f"新学生加入：{current_user.name}",
        content=f"学生 {current_user.name} 加入了您的班级「{class_obj.name}」",
        data={"class_id": class_obj.id, "student_id": current_user.id, "student_name": current_user.name}
    )

    return {
        "id": class_obj.id,
        "course_id": class_obj.course_id,
        "teacher_id": class_obj.teacher_id,
        "name": class_obj.name,
        "invite_code": class_obj.invite_code,
        "status": class_obj.status,
        "start_time": class_obj.start_time,
        "created_at": class_obj.created_at,
    }


@router.post("/{class_id}/leave")
async def leave_class(
    class_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Leave a class (students only)."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can leave classes",
        )

    # Get student profile
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )

    # Find enrollment
    result = await db.execute(
        select(ClassEnrollment).where(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.student_id == student.user_id,
        )
    )
    enrollment = result.scalar_one_or_none()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not enrolled in this class",
        )

    # Delete enrollment
    await db.delete(enrollment)
    await db.commit()

    return {"message": "Left class successfully"}
