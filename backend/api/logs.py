"""Logs API routes - no database dependency."""
from fastapi import APIRouter, HTTPException

from models import memory_store
from services.log_manager import log_manager
from services.crontab_manager import crontab_manager

router = APIRouter()


@router.get("/task/{task_id}")
def get_task_cron_log(task_id: int, lines: int = 100):
    """Get cron log for a task."""
    # Verify task exists
    if not crontab_manager.get_task(task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    
    log_content = crontab_manager.get_task_log(task_id, lines)
    return {
        "task_id": task_id,
        "log": log_content,
        "lines": lines
    }


@router.get("/task/{task_id}/size")
def get_log_size(task_id: int):
    """Get log file size."""
    # Verify task exists
    if not crontab_manager.get_task(task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    
    size = log_manager.get_log_size(task_id)
    return {
        "task_id": task_id,
        "size_bytes": size,
        "size_kb": round(size / 1024, 2)
    }


@router.post("/task/{task_id}/clear")
def clear_log(task_id: int):
    """Clear log file."""
    # Verify task exists
    if not crontab_manager.get_task(task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    
    success = log_manager.clear_log(task_id)
    if success:
        return {"message": "Log cleared successfully"}
    raise HTTPException(status_code=500, detail="Failed to clear log")


@router.get("/run/{run_id}")
def get_run_log(run_id: int):
    """Get manual run log from memory."""
    run = memory_store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    return {
        "run_id": run_id,
        "task_id": run.task_id,
        "status": run.status,
        "log": run.log_output or "",
        "exit_code": run.exit_code,
        "start_time": run.start_time,
        "end_time": run.end_time,
    }
