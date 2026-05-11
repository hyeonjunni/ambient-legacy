from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.api.router import api_router
from app.core.config import settings
from app.core.database import Base, close_connector, engine
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
    with engine.begin() as connection:
        inspector = inspect(connection)
        existing_columns = {column["name"] for column in inspector.get_columns("users")}
        column_statements = {
            "age": "ALTER TABLE users ADD COLUMN age INTEGER",
            "gender": "ALTER TABLE users ADD COLUMN gender VARCHAR",
            "phone": "ALTER TABLE users ADD COLUMN phone VARCHAR",
            "profile_chunk": "ALTER TABLE users ADD COLUMN profile_chunk TEXT",
        }

        for column_name, statement in column_statements.items():
            if column_name not in existing_columns:
                connection.execute(text(statement))


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_user_profile_columns()


@app.on_event("shutdown")
def on_shutdown():
    close_connector()


app.mount('/media', StaticFiles(directory=str(MEDIA_ROOT)), name='media')
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/")
def read_root():
    return {
        "service": settings.app_name,
        "status": "ok",
    }
