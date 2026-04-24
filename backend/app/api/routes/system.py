from fastapi import APIRouter
from sqlalchemy import text

from app.core.database import SessionLocal


router = APIRouter()


@router.get("/health/db")
def database_healthcheck():
    session = SessionLocal()
    try:
        session.execute(text("SELECT 1"))
        return {
            "database": "connected",
        }
    finally:
        session.close()

