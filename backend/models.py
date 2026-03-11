"""Database models - simplified for crontab mode."""
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from config import get_settings

settings = get_settings()

Base = declarative_base()
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Task(Base):
    """Task model - minimal info for crontab management."""
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    cron = Column(String(100), nullable=False)
    # Task type: 'inline' (script content) or 'file' (existing script file)
    task_type = Column(String(20), default="inline")
    # For 'file' type: path to existing script
    script_source_path = Column(String(500), nullable=True)
    # Script file path (auto-generated wrapper script for 'inline' type, symlink/copy for 'file' type)
    script_path = Column(String(500), nullable=True)
    # Custom log output path (optional, for 'file' type)
    custom_log_path = Column(String(500), nullable=True)
    # Working directory for the script
    working_dir = Column(String(500), nullable=True, default="")
    # Environment variables (JSON format)
    env_vars = Column(Text, nullable=True, default="{}")
    status = Column(String(20), default="enabled")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "cron": self.cron,
            "task_type": self.task_type,
            "script_source_path": self.script_source_path,
            "script_path": self.script_path,
            "custom_log_path": self.custom_log_path,
            "working_dir": self.working_dir,
            "env_vars": self.env_vars,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TaskRun(Base):
    """Task execution run model - for tracking manual execution history."""
    __tablename__ = "task_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, nullable=False, index=True)
    status = Column(String(20), default="running")
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    log_output = Column(Text, nullable=True)
    exit_code = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": self.id,
            "task_id": self.task_id,
            "status": self.status,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "log_output": self.log_output,
            "exit_code": self.exit_code,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Setting(Base):
    """System settings model."""
    __tablename__ = "settings"
    
    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            "key": self.key,
            "value": self.value,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database."""
    Base.metadata.create_all(bind=engine)
