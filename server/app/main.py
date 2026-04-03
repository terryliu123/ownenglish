from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os

from app.core.config import get_settings
from app.db.session import init_db
from app.db.session import async_session_maker
from app.api.v1 import auth, classes, study_packs, live, live_challenges, audio, reports, free_practice, live_analytics, images, notifications, admin, membership, media, experiments
from app.services.membership import ensure_all_teacher_memberships, ensure_membership_plans
from app.services.system_settings import load_runtime_settings

settings = get_settings()

# Ensure uploads directory exists - 优先从环境变量读取，统一与 api 文件的路径计算
_base_dir = os.environ.get("UPLOADS_BASE_DIR")
if not _base_dir:
    # 尝试检测常见的部署路径
    _possible_paths = [
        "/www/wwwroot/ownenglish/server",  # Baota 面板默认路径
        "/var/www/ownenglish/server",       # 常见 Linux 路径
    ]
    for _path in _possible_paths:
        if os.path.exists(_path):
            _base_dir = _path
            break
    if not _base_dir:
        _base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = _base_dir
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(os.path.join(UPLOADS_DIR, "audio"), exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "images"), exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "media"), exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "experiments"), exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for FastAPI app."""
    # Startup
    await init_db()
    async with async_session_maker() as session:
        await ensure_membership_plans(session)
        await ensure_all_teacher_memberships(session)
        await load_runtime_settings(session)
        await session.commit()
    print(f"[INFO] {settings.APP_NAME} v{settings.APP_VERSION} started")
    print(f"[INFO] API Docs: http://localhost:8000/docs")
    yield
    # Shutdown
    print("[INFO] Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="教学辅助系统 API - 直播英语老师的教学辅助平台",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(classes.router, prefix="/api/v1")
app.include_router(study_packs.router, prefix="/api/v1")
app.include_router(live_challenges.router, prefix="/api/v1")
app.include_router(live.router, prefix="/api/v1")
app.include_router(audio.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(free_practice.router, prefix="/api/v1")
app.include_router(live_analytics.router, prefix="/api/v1")
app.include_router(images.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(membership.router, prefix="/api/v1")
app.include_router(media.router, prefix="/api/v1")
app.include_router(experiments.router, prefix="/api/v1")

# Serve uploaded audio files
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
