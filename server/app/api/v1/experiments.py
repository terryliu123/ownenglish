"""Experiment HTML file upload endpoints."""
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.v1.auth import get_current_user
from app.models import User, UserRole

router = APIRouter(prefix="/experiments", tags=["Experiments"])

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
    upload_dir = os.path.join(base_dir, "uploads", "experiments")
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir

ALLOWED_EXTENSIONS = {".html", ".htm"}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB


@router.post("/upload")
async def upload_experiment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload an HTML experiment file (teachers only)."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can upload experiments")

    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 2MB")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{timestamp}_{unique_id}{file_ext}"
    upload_dir = _get_upload_dir()
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    experiment_url = f"/api/v1/experiments/{filename}"

    return {
        "url": experiment_url,
        "filename": filename,
        "size": len(content),
    }


@router.get("/{filename}")
async def get_experiment(
    filename: str,
):
    """Serve an experiment HTML file."""
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    upload_dir = _get_upload_dir()
    filepath = os.path.join(upload_dir, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Experiment not found")

    return FileResponse(
        filepath,
        media_type="text/plain",
        filename=filename,
    )
