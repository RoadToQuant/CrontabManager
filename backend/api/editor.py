"""Editor API routes for script content."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import Task, get_db
from services.file_storage import file_storage

router = APIRouter()


class ScriptContent(BaseModel):
    content: str


@router.get("/{task_id}/script")
def get_script(task_id: int, db: Session = Depends(get_db)):
    """Get script content for a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Read from file
    script_path = file_storage.get_script_path(task_id)
    if script_path.exists():
        content = script_path.read_text(encoding='utf-8')
    else:
        content = file_storage.get_default_template()
    
    return {
        "task_id": task_id,
        "content": content,
        "name": task.name,
    }


@router.put("/{task_id}/script")
async def update_script(task_id: int, data: ScriptContent, db: Session = Depends(get_db)):
    """Update script content for a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Save to file
    await file_storage.write_script(task_id, data.content)
    
    # Update crontab
    from services.crontab_manager import crontab_manager
    script_path = crontab_manager.add_or_update_task(
        task.id,
        task.name,
        task.cron,
        data.content,
        task.working_dir,
        task.env_vars,
        enabled=(task.status == "enabled")
    )
    
    if script_path:
        task.script_path = str(script_path)
        from datetime import datetime
        task.updated_at = datetime.utcnow()
        db.commit()
    
    return {"message": "Script updated successfully"}


@router.get("/template")
def get_template():
    """Get default script template."""
    return {
        "content": file_storage.get_default_template()
    }
