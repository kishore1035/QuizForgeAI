import os
import re
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# Base class for SQLAlchemy ORM models
Base = declarative_base()


def _ensure_sqlite_directory(db_url: str) -> None:
    """Ensure directory exists for SQLite database files."""
    if db_url.startswith("sqlite:///"):
        raw_path = db_url.replace("sqlite:///", "")
        # Remove query parameters if any (e.g. ?check_same_thread=true)
        raw_path = raw_path.split("?")[0]
        # Ignore in-memory
        if raw_path not in (":memory:", ""):
            dir_name = os.path.dirname(os.path.abspath(raw_path))
            if dir_name:
                os.makedirs(dir_name, exist_ok=True)


_ensure_sqlite_directory(settings.DATABASE_URL)

# Configure connection arguments based on database dialect
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

# Enable foreign keys on SQLite
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize database tables and directories."""
    _ensure_sqlite_directory(settings.DATABASE_URL)
    # Ensure upload directory exists
    if settings.UPLOAD_DIR:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Import models to ensure they are registered with Base metadata
    import app.db.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
