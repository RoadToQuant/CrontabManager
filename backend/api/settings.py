"""Settings API routes."""
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models import Setting, get_db
from config import get_settings
from services.crontab_manager import crontab_manager

router = APIRouter()
settings = get_settings()


class SettingUpdate(BaseModel):
    value: str


@router.get("")
def get_all_settings(db: Session = Depends(get_db)):
    """Get all settings."""
    db_settings = db.query(Setting).all()
    
    # Add system info
    return {
        "settings": {s.key: s.value for s in db_settings},
        "system": {
            "crontab_user": settings.crontab_user or "current user",
            "cron_task_prefix": settings.cron_task_prefix,
            "scripts_dir": settings.scripts_dir,
        }
    }


@router.get("/{key}")
def get_setting(key: str, db: Session = Depends(get_db)):
    """Get a specific setting."""
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return {"key": key, "value": setting.value}


@router.put("/{key}")
def update_setting(key: str, data: SettingUpdate, db: Session = Depends(get_db)):
    """Update a setting."""
    setting = db.query(Setting).filter(Setting.key == key).first()
    
    if setting:
        setting.value = data.value
    else:
        setting = Setting(key=key, value=data.value)
        db.add(setting)
    
    db.commit()
    return {"key": key, "value": data.value}


@router.get("/crontab/raw")
def get_raw_crontab():
    """Get raw crontab content."""
    content = crontab_manager._get_crontab_content()
    return {"content": content}


@router.post("/crontab/sync")
def sync_crontab(db: Session = Depends(get_db)):
    """Sync database tasks with crontab."""
    from models import Task
    tasks = db.query(Task).all()
    result = crontab_manager.sync_task_status(tasks)
    return result
