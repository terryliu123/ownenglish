from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta, datetime, timezone
import logging
import random
import string
import uuid

logger = logging.getLogger(__name__)

from app.db.session import get_db
from app.models import User, TeacherProfile, StudentProfile, UserRole, GuestSession, ClassEnrollment, VerificationCode, PasswordResetToken
from app.schemas import (
    UserCreate, UserLogin, Token, UserResponse, ChangePasswordRequest,
    SendVerificationCodeRequest, VerifyCodeRequest, ForgotPasswordRequest, ResetPasswordRequest,
)
from app.core.presence import presence_manager
from app.core.email import send_verification_code, send_password_reset_email
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.password_validation import check_password_strength
from app.core.config import get_settings
from app.services.membership import ensure_teacher_membership, serialize_teacher_membership_snapshot

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Check if guest session has expired
    if user.is_guest:
        result = await db.execute(select(GuestSession).where(GuestSession.user_id == user.id))
        guest_session = result.scalar_one_or_none()
        if guest_session and guest_session.expires_at < datetime.now(timezone.utc):
            # Clean up expired guest: remove all related records
            # 1. Delete live task group submissions
            from app.models import LiveTaskGroupSubmission, LiveSubmission
            group_submissions = (await db.execute(
                select(LiveTaskGroupSubmission).where(LiveTaskGroupSubmission.student_id == user.id)
            )).scalars().all()
            for gs in group_submissions:
                await db.delete(gs)

            # 2. Delete live submissions
            live_submissions = (await db.execute(
                select(LiveSubmission).where(LiveSubmission.student_id == user.id)
            )).scalars().all()
            for ls in live_submissions:
                await db.delete(ls)

            # 3. Delete enrollments
            enrollments = (await db.execute(
                select(ClassEnrollment).where(ClassEnrollment.student_id == user.id)
            )).scalars().all()
            for enrollment in enrollments:
                await db.delete(enrollment)

            # 4. Delete guest session
            if guest_session:
                await db.delete(guest_session)

            # 5. Delete student profile
            result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user.id))
            profile = result.scalar_one_or_none()
            if profile:
                await db.delete(profile)

            # 6. Finally delete user
            await db.delete(user)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Guest session has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    try:
        logger.info(f"Received registration request for email: {user_data.email}")
        normalized_role = str(user_data.role).upper()

        # Validate password strength
        is_valid, error_messages = check_password_strength(user_data.password)
        if not is_valid:
            logger.warning(f"Password too weak for user: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"密码强度不足: {'; '.join(error_messages)}",
            )

        # Check if email already exists
        result = await db.execute(select(User).where(User.email == user_data.email))
        existing_email = result.scalar_one_or_none()

        if existing_email:
            logger.warning(f"Email already registered: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Check if username already exists
        result = await db.execute(select(User).where(User.username == user_data.username))
        existing_username = result.scalar_one_or_none()

        if existing_username:
            logger.warning(f"Username already taken: {user_data.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )

        logger.info(f"Creating user: {user_data.email}")

        # Create user
        password_hash = get_password_hash(user_data.password)
        logger.info(f"Password hash created, length: {len(password_hash)}")

        user = User(
            email=user_data.email,
            username=user_data.username,
            password_hash=password_hash,
            name=user_data.name,
            role=UserRole(normalized_role),
        )
        db.add(user)
        await db.flush()
        logger.info(f"User flushed to DB, ID: {user.id}")

        # Create profile based on role
        if user.role == UserRole.TEACHER:
            profile = TeacherProfile(user_id=user.id)
        else:
            profile = StudentProfile(user_id=user.id)

        db.add(profile)
        logger.info(f"Profile created for user: {user.id}")
        await db.flush()
        if user.role == UserRole.TEACHER:
            await ensure_teacher_membership(db, user.id, create_trial=True)

        await db.commit()
        await db.refresh(user)
        logger.info(f"Registration completed for user: {user.id}")

        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Registration failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}\n{traceback.format_exc()}",
        )


@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login and get access token."""
    try:
        # Find user by email or username
        result = await db.execute(
            select(User).where(
                (User.email == login_data.email_or_username) | (User.username == login_data.email_or_username)
            )
        )
        user = result.scalar_one_or_none()

        # Check if account is locked
        if user and user.locked_until and user.locked_until > datetime.now(timezone.utc):
            remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() / 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account is locked due to multiple failed login attempts. Try again in {remaining} minutes.",
            )

        if not user or not verify_password(login_data.password, user.password_hash or ""):
            # Increment failed attempts
            if user:
                user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
                if user.failed_login_attempts >= 3:
                    user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=30)
                    await db.commit()
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Too many failed login attempts. Account locked for 30 minutes.",
                    )
                await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )

        # Reset failed attempts on successful login
        user.failed_login_attempts = 0
        user.locked_until = None

        # Ensure student profile exists for student users
        if user.role == UserRole.STUDENT:
            result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user.id))
            if not result.scalar_one_or_none():
                db.add(StudentProfile(user_id=user.id))

        await db.commit()

        # Create tokens
        access_token = create_access_token(
            data={"sub": user.id, "role": user.role.value},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        refresh_token = create_refresh_token(
            data={"sub": user.id},
            expires_delta=timedelta(days=7),
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Login failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}\n{traceback.format_exc()}",
        )


@router.post("/refresh")
async def refresh_token(request: Request, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token."""
    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    refresh_token_value = body.get("refresh_token")

    if not refresh_token_value:
        raise HTTPException(status_code=401, detail="Refresh token required")

    payload = decode_token(refresh_token_value)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    access_token = create_access_token(
        data={"sub": user.id, "role": user.role.value},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    new_refresh = create_refresh_token(
        data={"sub": user.id},
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )

    return {
        "access_token": access_token,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get current user information."""
    membership = None
    if current_user.role == UserRole.TEACHER:
        membership = await serialize_teacher_membership_snapshot(db, current_user.id)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role.value,
        "is_guest": current_user.is_guest,
        "membership": membership,
    }


@router.post("/presence/heartbeat")
async def heartbeat(current_user: User = Depends(get_current_user)):
    """Refresh the current user's online presence."""
    presence_manager.heartbeat(current_user.id)
    return {"status": "ok", "online": True, "user_id": current_user.id}


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change the current user's password."""
    # Guests cannot change password
    if current_user.is_guest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guest accounts cannot change password",
        )

    # Verify current password
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password set for this account",
        )

    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Update password
    current_user.password_hash = get_password_hash(data.new_password)
    await db.commit()

    return {"message": "Password changed successfully"}


def generate_code(length: int = 6) -> str:
    """Generate a random numeric code."""
    return "".join(random.choices(string.digits, k=length))


@router.post("/send-verification-code")
async def send_verification_code_endpoint(
    data: SendVerificationCodeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a verification code to the specified email."""
    # For register purpose, check if email already exists
    if data.purpose == "register":
        result = await db.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email is already registered",
            )

    # Generate and store code
    code = generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    # Invalidate old unused codes for this email and purpose
    result = await db.execute(
        select(VerificationCode).where(
            VerificationCode.email == data.email,
            VerificationCode.purpose == data.purpose,
            VerificationCode.used == False,
        )
    )
    old_codes = result.scalars().all()
    for old in old_codes:
        await db.delete(old)

    verification = VerificationCode(
        email=data.email,
        code=code,
        purpose=data.purpose,
        expires_at=expires_at,
    )
    db.add(verification)
    await db.commit()

    # Send email
    if data.purpose == "register":
        sent = send_verification_code(data.email, code)
    else:
        # For reset password, we still send verification if email exists
        result = await db.execute(select(User).where(User.email == data.email))
        if not result.scalar_one_or_none():
            # Don't reveal whether email exists
            return {"message": "If the email is registered, a code has been sent"}
        sent = send_verification_code(data.email, code)

    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email",
        )

    return {"message": "Verification code sent", "expires_in": 300}


@router.post("/verify-code")
async def verify_code_endpoint(
    data: VerifyCodeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify an email code."""
    result = await db.execute(
        select(VerificationCode).where(
            VerificationCode.email == data.email,
            VerificationCode.code == data.code,
            VerificationCode.purpose == data.purpose,
            VerificationCode.used == False,
        )
    )
    verification = result.scalar_one_or_none()

    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code",
        )

    if verification.expires_at < datetime.now(timezone.utc):
        await db.delete(verification)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code has expired",
        )

    # Mark as used
    verification.used = True
    await db.commit()

    return {"message": "Code verified", "email": data.email}


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send password reset email."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    # Always return success to prevent email enumeration
    if not user or user.is_guest:
        return {"message": "If the email is registered, a reset link has been sent"}

    # Generate temp password and token
    temp_password = generate_code(length=8)
    reset_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

    # Invalidate old tokens
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.email == data.email,
            PasswordResetToken.used == False,
        )
    )
    old_tokens = result.scalars().all()
    for old in old_tokens:
        await db.delete(old)

    # Store token with hashed temp password
    reset_record = PasswordResetToken(
        email=data.email,
        token=reset_token,
        temp_password=get_password_hash(temp_password),
        expires_at=expires_at,
    )
    db.add(reset_record)
    await db.commit()

    # Send email
    sent = send_password_reset_email(data.email, reset_token, temp_password)
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send reset email",
        )

    return {"message": "Password reset email sent"}


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using a reset token."""
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == data.token,
            PasswordResetToken.used == False,
        )
    )
    reset_record = result.scalar_one_or_none()

    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    if reset_record.expires_at < datetime.now(timezone.utc):
        await db.delete(reset_record)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired",
        )

    # Find user and update password
    result = await db.execute(select(User).where(User.email == reset_record.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.password_hash = get_password_hash(data.new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    reset_record.used = True
    await db.commit()

    return {"message": "Password has been reset successfully"}
