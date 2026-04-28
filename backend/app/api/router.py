from fastapi import APIRouter

from app.api.routes import ai, auth, families, uploads
from app.api.routes import system


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(families.router, prefix="/families", tags=["families"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
