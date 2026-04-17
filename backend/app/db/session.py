from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif settings.database_url.startswith("postgresql"):
    # Avoid long startup stalls if DATABASE_URL is unreachable in hosted environments.
    connect_args = {"connect_timeout": 5}
else:
    connect_args = {}
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
