"""Media file upload endpoints for audio/video content."""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.db.session import get_db
from app.api.v1.auth import get_current_user
from app.models import User, UserRole

router = APIRouter(prefix="/media", tags=["Media"])

def _get_upload_dir() -> str:
    """Get upload directory path - computed at call time."""
    base_dir = os.environ.get("UPLOADS_BASE_DIR")
    if not base_dir:
        possible_paths = [
            "/www/wwwroot/ownenglish/server",
            "/var/www/ownenglish/server",
        ]
        for path in possible_paths:
            if os.path.exists(path):
                base_dir = path
                break
        if not base_dir:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    upload_dir = os.path.join(base_dir, "uploads", "media")
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir

ALLOWED_AUDIO = {".mp3", ".wav", ".ogg", ".m4a", ".aac", ".webm"}
ALLOWED_VIDEO = {".mp4", ".webm", ".mov"}
ALLOWED_EXTENSIONS = ALLOWED_AUDIO | ALLOWED_VIDEO
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# MIME type mapping
MIME_MAP = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".webm": "video/webm",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
}


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload an audio or video file for study pack content."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can upload media")

    upload = file
    if not upload:
        raise HTTPException(status_code=400, detail="No media file provided")

    # Validate file extension
    file_ext = os.path.splitext(upload.filename or "")[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Read file content
    content = await upload.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")

    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{timestamp}_{unique_id}{file_ext}"
    upload_dir = _get_upload_dir()
    filepath = os.path.join(upload_dir, filename)

    # Save file
    with open(filepath, "wb") as f:
        f.write(content)

    # Determine media type
    is_video = file_ext in ALLOWED_VIDEO
    media_url = f"/api/v1/media/{filename}"

    return {
        "url": media_url,
        "filename": filename,
        "size": len(content),
        "media_type": "video" if is_video else "audio",
    }


@router.get("/{filename}")
async def get_media(filename: str):
    """Get a media file."""
    # Validate filename to prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    upload_dir = _get_upload_dir()
    filepath = os.path.join(upload_dir, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Media not found")

    ext = os.path.splitext(filename)[1]
    media_type = MIME_MAP.get(ext, "application/octet-stream")

    return FileResponse(
        filepath,
        media_type=media_type,
        filename=filename,
    )


@router.delete("/{filename}")
async def delete_media(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a media file (teacher only)."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can delete media")

    # Validate filename
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    upload_dir = _get_upload_dir()
    filepath = os.path.join(upload_dir, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Media not found")

    # Delete file
    os.remove(filepath)

    return {"status": "deleted", "filename": filename}
