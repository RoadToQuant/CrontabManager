"""Task API routes - crontab as single source of truth."""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from models import Task, memory_store
from services.crontab_manager import crontab_manager
from services.task_runner import task_runner
from services.file_storage import file_storage

router = APIRouter()


# Pydantic models for request validation
class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    cron: str = Field(..., min_length=1, max_length=100)
    script_content: str = Field(..., min_length=1)
    working_dir: Optional[str] = ""
    env_vars: Optional[str] = "{}"


class TaskUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    cron: Optional[str] = Field(None, min_length=1, max_length=100)
    script_content: Optional[str] = None
    working_dir: Optional[str] = None
    env_vars: Optional[str] = None


class DeleteOptions(BaseModel):
    """Options for task deletion."""
    delete_script: bool = True  # 删除脚本文件
    delete_log: bool = True     # 删除日志文件
    # Note: Task record is always removed from crontab (cannot be kept)


@router.get("")
def list_tasks():
    """Get all tasks from crontab."""
    tasks = crontab_manager.get_all_tasks()
    return [task.to_dict() for task in tasks]


@router.post("")
def create_task(task_data: TaskCreate):
    """Create a new task and add to crontab."""
    task = Task(
        id=0,  # Will be assigned by crontab_manager
        name=task_data.name,
        description=task_data.description or "",
        cron=task_data.cron,
        working_dir=task_data.working_dir or "",
        env_vars=task_data.env_vars or "{}",
        status="enabled",
        created_at=datetime.utcnow().isoformat(),
    )
    
    script_path = crontab_manager.add_or_update_task(task, task_data.script_content)
    
    if not script_path:
        raise HTTPException(status_code=500, detail="Failed to add task to crontab")
    
    # Return with script_content
    result = task.to_dict()
    result['script_content'] = task_data.script_content
    return result


@router.get("/{task_id}")
def get_task(task_id: int):
    """Get task details."""
    task = crontab_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = task.to_dict()
    
    # Read script content from file
    script_path = file_storage.get_script_path(task_id)
    if script_path.exists():
        result['script_content'] = script_path.read_text(encoding='utf-8')
    else:
        result['script_content'] = file_storage.get_default_template()
    
    return result


@router.put("/{task_id}")
def update_task(task_id: int, task_data: TaskUpdate):
    """Update a task."""
    task = crontab_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update fields
    if task_data.name is not None:
        task.name = task_data.name
    if task_data.description is not None:
        task.description = task_data.description
    if task_data.cron is not None:
        task.cron = task_data.cron
    if task_data.working_dir is not None:
        task.working_dir = task_data.working_dir
    if task_data.env_vars is not None:
        task.env_vars = task_data.env_vars
    
    task.updated_at = datetime.utcnow().isoformat()
    
    # Get script content
    script_content = task_data.script_content
    if script_content is None:
        script_path = file_storage.get_script_path(task_id)
        if script_path.exists():
            script_content = script_path.read_text(encoding='utf-8')
        else:
            script_content = file_storage.get_default_template()
    
    # Update crontab
    script_path = crontab_manager.add_or_update_task(task, script_content)
    
    if not script_path:
        raise HTTPException(status_code=500, detail="Failed to update crontab")
    
    # Return with script_content
    result = task.to_dict()
    result['script_content'] = script_content
    return result


@router.delete("/{task_id}")
def delete_task(task_id: int, options: Optional[DeleteOptions] = None):
    """Delete a task with options.
    
    Args:
        options: DeleteOptions with delete_script and delete_log flags.
                If not provided, both script and log will be deleted.
    """
    if not crontab_manager.get_task(task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Default options
    delete_script = True
    delete_log = True
    if options:
        delete_script = options.delete_script
        delete_log = options.delete_log
    
    if crontab_manager.delete_task_with_options(task_id, delete_script, delete_log):
        return {"message": "Task deleted successfully"}
    
    raise HTTPException(status_code=500, detail="Failed to delete task from crontab")


@router.post("/{task_id}/toggle")
def toggle_task(task_id: int):
    """Toggle task enabled/disabled status.
    
    Note: suspended tasks cannot be toggled. Use resume for suspended tasks.
    """
    task = crontab_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status == "suspended":
        raise HTTPException(status_code=400, detail="Suspended tasks cannot be toggled. Use resume instead.")
    
    if crontab_manager.toggle_task(task_id):
        task = crontab_manager.get_task(task_id)
        return {"message": f"Task {task.status}", "status": task.status}
    
    raise HTTPException(status_code=500, detail="Failed to update crontab")


@router.post("/{task_id}/suspend")
def suspend_task(task_id: int):
    """Suspend a task - comment out in crontab but keep all files.
    
    Suspended tasks can be resumed later.
    """
    task = crontab_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status == "suspended":
        return {"message": "Task is already suspended", "status": "suspended"}
    
    if crontab_manager.suspend_task(task_id):
        return {"message": "Task suspended", "status": "suspended"}
    
    raise HTTPException(status_code=500, detail="Failed to suspend task")


@router.post("/{task_id}/resume")
def resume_task(task_id: int):
    """Resume a suspended task - re-enable in crontab.
    
    Only suspended tasks can be resumed.
    """
    task = crontab_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status != "suspended":
        raise HTTPException(status_code=400, detail="Only suspended tasks can be resumed")
    
    if crontab_manager.resume_task(task_id):
        return {"message": "Task resumed", "status": "enabled"}
    
    raise HTTPException(status_code=500, detail="Failed to resume task")


@router.post("/{task_id}/run")
async def run_task(task_id: int):
    """Run a task immediately (manual execution)."""
    task = crontab_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        run = await task_runner.run_task(task_id, task)
        return {"message": "Task executed", "run": run.to_dict()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}/runs")
def get_task_runs(task_id: int, limit: int = 20):
    """Get task execution history from memory."""
    task = crontab_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    runs = memory_store.get_task_runs(task_id, limit)
    return [run.to_dict() for run in runs]


@router.get("/{task_id}/cron-log")
def get_cron_log(task_id: int, lines: int = 100):
    """Get cron log for a task."""
    if not crontab_manager.get_task(task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    
    log_content = crontab_manager.get_task_log(task_id, lines)
    return {"log": log_content}


@router.post("/sync")
def sync_crontab():
    """Sync from crontab - cleanup orphan directories."""
    result = crontab_manager.sync_from_crontab()
    return result
