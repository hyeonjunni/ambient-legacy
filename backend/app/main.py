from fastapi import FastAPI

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


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/")
def read_root():
    return {
        "service": settings.app_name,
        "status": "ok",
    }
