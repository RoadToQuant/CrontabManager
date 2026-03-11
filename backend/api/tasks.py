"""Task API routes."""
from typing import List, Optional
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models import Task, TaskRun, get_db
from services.crontab_manager import crontab_manager
from services.task_runner import task_runner
from services.file_storage import file_storage

router = APIRouter()


# Pydantic models
class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    cron: str = Field(..., min_length=1, max_length=100)
    # Task type: 'inline' (script content) or 'file' (existing script file)
    task_type: str = Field(default="inline", pattern="^(inline|file)$")
    # For 'inline' type: script content
    script_content: Optional[str] = None
    # For 'file' type: path to existing script
    script_source_path: Optional[str] = None
    # Custom log output path (optional)
    custom_log_path: Optional[str] = None
    working_dir: Optional[str] = ""
    env_vars: Optional[str] = "{}"
    status: str = Field(default="enabled", pattern="^(enabled|disabled)$")


class TaskUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    cron: Optional[str] = Field(None, min_length=1, max_length=100)
    script_content: Optional[str] = None
    custom_log_path: Optional[str] = None
    working_dir: Optional[str] = None
    env_vars: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(enabled|disabled)$")


class TaskResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    cron: str
    task_type: str
    script_source_path: Optional[str]
    script_path: Optional[str]
    custom_log_path: Optional[str]
    working_dir: Optional[str]
    env_vars: Optional[str]
    status: str
    created_at: str
    updated_at: str
    script_content: Optional[str] = None
    
    class Config:
        from_attributes = True


@router.get("", response_model=List[TaskResponse])
def list_tasks(db: Session = Depends(get_db)):
    """Get all tasks."""
    tasks = db.query(Task).all()
    return [task.to_dict() for task in tasks]


@router.post("", response_model=TaskResponse)
def create_task(task_data: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task and add to crontab."""
    
    # Validate task type specific fields
    if task_data.task_type == "inline":
        if not task_data.script_content:
            raise HTTPException(status_code=400, detail="Script content is required for inline tasks")
        script_content = task_data.script_content
    elif task_data.task_type == "file":
        if not task_data.script_source_path:
            raise HTTPException(status_code=400, detail="Script source path is required for file tasks")
        # Validate source file exists and is executable
        source_path = Path(task_data.script_source_path).expanduser().resolve()
        if not source_path.exists():
            raise HTTPException(status_code=400, detail=f"Script file not found: {task_data.script_source_path}")
        if not source_path.is_file():
            raise HTTPException(status_code=400, detail=f"Path is not a file: {task_data.script_source_path}")
        # Read script content for wrapper generation
        try:
            script_content = source_path.read_text(encoding='utf-8')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read script file: {e}")
    else:
        raise HTTPException(status_code=400, detail=f"Invalid task type: {task_data.task_type}")
    
    # Create task in database
    db_data = task_data.model_dump(exclude={'script_content'})
    task = Task(**db_data)
    db.add(task)
    db.commit()
    db.refresh(task)
    
    # Save script content to file and add to crontab
    try:
        script_path = crontab_manager.add_or_update_task(
            task.id,
            task.name,
            task.cron,
            script_content,
            task.working_dir,
            task.env_vars,
            enabled=(task.status == "enabled"),
            task_type=task.task_type,
            script_source_path=task.script_source_path,
            custom_log_path=task.custom_log_path
        )
    except Exception as e:
        # Rollback if crontab failed
        db.delete(task)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to add task to crontab: {e}")
    
    if script_path:
        task.script_path = str(script_path)
        db.commit()
    else:
        # Rollback if crontab failed
        db.delete(task)
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to add task to crontab")
    
    # Return with script_content
    result = task.to_dict()
    result['script_content'] = script_content
    return result


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get task details."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = task.to_dict()
    # Read script content from file
    try:
        script_path = file_storage.get_script_path(task_id)
        if script_path.exists():
            with open(script_path, 'r', encoding='utf-8') as f:
                result['script_content'] = f.read()
        else:
            result['script_content'] = ""
    except Exception:
        result['script_content'] = ""
    
    return result


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_data: TaskUpdate, db: Session = Depends(get_db)):
    """Update a task and update crontab."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update database fields (excluding script_content)
    update_data = task_data.model_dump(exclude_unset=True, exclude={'script_content'})
    for field, value in update_data.items():
        if value is not None:
            setattr(task, field, value)
    
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    
    # Get script content
    if task_data.script_content is not None:
        script_content = task_data.script_content
        # Save to file
        import asyncio
        asyncio.run(file_storage.write_script(task_id, script_content))
    else:
        # Read existing script
        script_path = file_storage.get_script_path(task_id)
        if script_path.exists():
            with open(script_path, 'r', encoding='utf-8') as f:
                script_content = f.read()
        else:
            script_content = "#!/bin/bash\n"
    
    # Update crontab
    try:
        script_path = crontab_manager.add_or_update_task(
            task.id,
            task.name,
            task.cron,
            script_content,
            task.working_dir,
            task.env_vars,
            enabled=(task.status == "enabled"),
            task_type=task.task_type,
            script_source_path=task.script_source_path,
            custom_log_path=task.custom_log_path
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update crontab: {e}")
    
    if script_path:
        task.script_path = str(script_path)
        db.commit()
    else:
        raise HTTPException(status_code=500, detail="Failed to update crontab")
    
    # Return with script_content
    result = task.to_dict()
    result['script_content'] = script_content
    return result


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task and remove from crontab."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Remove from crontab
    if not crontab_manager.remove_task(task_id):
        raise HTTPException(status_code=500, detail="Failed to remove task from crontab")
    
    # Delete from database
    db.delete(task)
    db.commit()
    
    return {"message": "Task deleted successfully"}


@router.post("/{task_id}/toggle")
def toggle_task(task_id: int, db: Session = Depends(get_db)):
    """Toggle task enabled/disabled status."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Toggle status
    new_status = "disabled" if task.status == "enabled" else "enabled"
    task.status = new_status
    task.updated_at = datetime.utcnow()
    db.commit()
    
    # Read current script content
    script_path = file_storage.get_script_path(task_id)
    if script_path.exists():
        with open(script_path, 'r', encoding='utf-8') as f:
            script_content = f.read()
    else:
        script_content = "#!/bin/bash\n"
    
    # Update crontab
    try:
        success = crontab_manager.toggle_task(
            task.id,
            task.name,
            task.cron,
            task.script_path or str(script_path),
            enabled=(new_status == "enabled")
        )
    except Exception as e:
        # Rollback
        task.status = "enabled" if new_status == "disabled" else "disabled"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to update crontab: {e}")
    
    if not success:
        # Rollback
        task.status = "enabled" if new_status == "disabled" else "disabled"
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to update crontab")
    
    return {"message": f"Task {new_status}", "status": new_status}


@router.post("/{task_id}/run")
async def run_task(task_id: int, db: Session = Depends(get_db)):
    """Run a task immediately (manual execution)."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        run = await task_runner.run_task(db, task_id)
        return {"message": "Task executed", "run": run.to_dict()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}/runs")
def get_task_runs(task_id: int, limit: int = 20, db: Session = Depends(get_db)):
    """Get task execution history."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    runs = db.query(TaskRun).filter(
        TaskRun.task_id == task_id
    ).order_by(TaskRun.id.desc()).limit(limit).all()
    
    return [run.to_dict() for run in runs]


@router.get("/{task_id}/cron-log")
def get_cron_log(task_id: int, lines: int = 100):
    """Get cron log for a task."""
    log_content = crontab_manager.get_task_log(task_id, lines)
    return {"log": log_content}


@router.post("/sync")
def sync_crontab(db: Session = Depends(get_db)):
    """Sync all database tasks with crontab."""
    tasks = db.query(Task).all()
    result = crontab_manager.sync_task_status(tasks)
    return result
