from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api.router import api_router
from app.core.config import settings
from app.core.database import Base, engine
from app.models.family import FamilyMember, FamilyRoom
from app.models.upload import Upload, UploadFile
from app.models.user import User


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Ambient Digital Legacy backend scaffold",
)

MEDIA_ROOT = Path(__file__).resolve().parent / 'storage'
UPLOADS_ROOT = MEDIA_ROOT / 'uploads'
UPLOADS_ROOT.mkdir(parents=True, exist_ok=True)


def ensure_user_profile_columns():
    alter_statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_chunk TEXT",
    ]

    with engine.begin() as connection:
        for statement in alter_statements:
            connection.execute(text(statement))


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_user_profile_columns()


app.mount('/media', StaticFiles(directory=str(MEDIA_ROOT)), name='media')
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/")
def read_root():
    return {
        "service": settings.app_name,
        "status": "ok",
    }
