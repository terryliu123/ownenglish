"""Audio file upload endpoints for speaking practice."""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.db.session import get_db
from app.api.v1.auth import get_current_user
from app.models import User, UserRole

router = APIRouter(prefix="/audio", tags=["Audio"])

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
    upload_dir = os.path.join(base_dir, "uploads", "audio")
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir

ALLOWED_EXTENSIONS = {".webm", ".mp4", ".wav", ".m4a", ".ogg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload")
async def upload_audio(
    file: UploadFile = File(None),
    audio: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload an audio recording."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can upload audio")

    upload = file or audio
    if not upload:
        raise HTTPException(status_code=400, detail="No audio file provided")

    # Validate file extension
    file_ext = os.path.splitext(upload.filename or "")[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
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

    # Return URL (relative path that can be served statically)
    audio_url = f"/api/v1/audio/{filename}"

    return {
        "url": audio_url,
        "filename": filename,
        "size": len(content),
    }


@router.get("/{filename}")
async def get_audio(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    """Get an audio file."""
    # Validate filename to prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    upload_dir = _get_upload_dir()
    filepath = os.path.join(upload_dir, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Audio not found")

    return FileResponse(
        filepath,
        media_type=f"audio/{os.path.splitext(filename)[1][1:]}",
        filename=filename,
    )


@router.delete("/{filename}")
async def delete_audio(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    """Delete an audio file (owner only)."""
    # Validate filename
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    filepath = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Audio not found")

    # Delete file
    os.remove(filepath)

    return {"status": "deleted", "filename": filename}
