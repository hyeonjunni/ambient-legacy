from google.cloud.sql.connector import Connector, IPTypes
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings

connector: Connector | None = None


def _build_engine():
    global connector

    if settings.use_cloud_sql_connector:
        connector = Connector(refresh_strategy="LAZY")
        ip_type = IPTypes.PRIVATE if settings.private_ip else IPTypes.PUBLIC

        def getconn():
            return connector.connect(
                settings.instance_connection_name,
                "pg8000",
                user=settings.db_user,
                password=settings.db_pass,
                db=settings.db_name,
                ip_type=ip_type,
            )

        return create_engine(
            "postgresql+pg8000://",
            creator=getconn,
            pool_pre_ping=True,
            pool_recycle=1800,
        )

    return create_engine(
        settings.database_url,
        echo=False,
        pool_pre_ping=True,
        pool_recycle=1800,
    )


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
