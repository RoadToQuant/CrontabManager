"""Editor API routes for script content - no database dependency."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.crontab_manager import crontab_manager
from services.file_storage import file_storage

router = APIRouter()


class ScriptContent(BaseModel):
    content: str


@router.get("/{task_id}/script")
def get_script(task_id: int):
    """Get script content for a task."""
    task = crontab_manager.get_task(task_id)
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
async def update_script(task_id: int, data: ScriptContent):
    """Update script content for a task."""
    task = crontab_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Save to file and update crontab
    script_path = crontab_manager.add_or_update_task(task, data.content)
    
    if not script_path:
        raise HTTPException(status_code=500, detail="Failed to update script")
    
    return {"message": "Script updated successfully"}


@router.get("/template")
def get_template():
    """Get default script template."""
    return {
        "content": file_storage.get_default_template()
    }
