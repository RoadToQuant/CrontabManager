"""Settings API routes - no database dependency."""
from fastapi import APIRouter

from config import get_settings
from services.crontab_manager import crontab_manager

router = APIRouter()
settings = get_settings()


@router.get("")
def get_all_settings():
    """Get all settings and system info."""
    return {
        "settings": {},  # No persistent settings storage anymore
        "system": {
            "crontab_user": settings.crontab_user or "current user",
            "cron_task_prefix": settings.cron_task_prefix,
            "scripts_dir": settings.scripts_dir,
            "mode": "crontab (sqlite-free)",
        }
    }


@router.get("/crontab/raw")
def get_raw_crontab():
    """Get raw crontab content."""
    content = crontab_manager._get_crontab_content()
    return {"content": content}


@router.post("/crontab/sync")
def sync_crontab():
    """Sync from crontab - cleanup orphan directories."""
    result = crontab_manager.sync_from_crontab()
    return result
