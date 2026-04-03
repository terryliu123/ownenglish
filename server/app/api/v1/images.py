"""Image file upload endpoints."""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.db.session import get_db
from app.api.v1.auth import get_current_user
from app.models import User, UserRole

router = APIRouter(prefix="/images", tags=["Images"])


def _get_upload_dir() -> str:
    """Get upload directory path - hardcoded for production."""
    # 硬编码路径，避免运行时检测问题
    upload_dir = "/www/wwwroot/ownenglish/server/uploads/images"
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
MAX_FILE_SIZE = 7 * 1024 * 1024  # 7MB


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload an image file. Teachers can upload for editing; students for classroom sharing."""
    if current_user.role not in (UserRole.TEACHER, UserRole.STUDENT):
        raise HTTPException(status_code=403, detail="Only teachers and students can upload images")

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No image file provided")

    # Validate file extension
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 7MB")

    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{timestamp}_{unique_id}{file_ext}"
    upload_dir = _get_upload_dir()
    filepath = os.path.join(upload_dir, filename)

    # Save file
    with open(filepath, "wb") as f:
        f.write(content)

    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Image saved: {filepath}, size={len(content)}")

    # Return URL (relative path that can be served statically)
    image_url = f"/api/v1/images/{filename}"

    return {
        "url": image_url,
        "filename": filename,
        "size": len(content),
    }


@router.get("/{filename}")
async def get_image(filename: str):
    """Get an image file."""
    # Validate filename to prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    upload_dir = _get_upload_dir()
    filepath = os.path.join(upload_dir, filename)

    if not os.path.exists(filepath):
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Image not found: {filepath}, upload_dir={upload_dir}, cwd={os.getcwd()}")
        # 列出目录中的文件帮助调试
        try:
            files = os.listdir(upload_dir) if os.path.exists(upload_dir) else []
            logger.error(f"Files in upload_dir: {files[:10]}")
        except Exception as e:
            logger.error(f"Failed to list upload_dir: {e}")
        raise HTTPException(status_code=404, detail=f"Image not found: {filename}")

    ext = os.path.splitext(filename)[1][1:]
    media_type = f"image/{ext}" if ext not in ("jpg", "jpeg") else "image/jpeg"

    return FileResponse(
        filepath,
        media_type=media_type,
        filename=filename,
    )
