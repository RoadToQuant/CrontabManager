"""Logs API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models import TaskRun, get_db
from services.log_manager import log_manager
from services.crontab_manager import crontab_manager

router = APIRouter()


@router.get("/task/{task_id}")
def get_task_cron_log(task_id: int, lines: int = 100):
    """Get cron log for a task."""
    log_content = crontab_manager.get_task_log(task_id, lines)
    return {
        "task_id": task_id,
        "log": log_content,
        "lines": lines
    }


@router.get("/task/{task_id}/size")
def get_log_size(task_id: int):
    """Get log file size."""
    size = log_manager.get_log_size(task_id)
    return {
        "task_id": task_id,
        "size_bytes": size,
        "size_kb": round(size / 1024, 2)
    }


@router.post("/task/{task_id}/clear")
def clear_log(task_id: int):
    """Clear log file."""
    success = log_manager.clear_log(task_id)
    if success:
        return {"message": "Log cleared successfully"}
    raise HTTPException(status_code=500, detail="Failed to clear log")


@router.get("/run/{run_id}")
def get_run_log(run_id: int, db: Session = Depends(get_db)):
    """Get manual run log."""
    run = db.query(TaskRun).filter(TaskRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    return {
        "run_id": run_id,
        "task_id": run.task_id,
        "status": run.status,
        "log": run.log_output or "",
        "exit_code": run.exit_code,
        "start_time": run.start_time.isoformat() if run.start_time else None,
        "end_time": run.end_time.isoformat() if run.end_time else None,
    }
