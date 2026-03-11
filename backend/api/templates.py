"""Task template API routes - simplified to two types."""
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from services.task_templates import get_template_info, generate_script

router = APIRouter()


@router.get("")
def get_templates():
    """Get all available task templates (simple and daemon)."""
    return {"templates": get_template_info()}


class DaemonPreviewRequest(BaseModel):
    target_script: str = Field(..., description="Path to the script to wrap")
    process_name: str = Field(..., description="Process name for identification")
    working_dir: Optional[str] = ""
    env_vars: Optional[str] = "{}"
    auto_restart: bool = True
    restart_delay: int = 5
    max_restarts: int = 3


@router.post("/daemon/preview")
def preview_daemon_template(data: DaemonPreviewRequest):
    """Preview generated daemon wrapper script without saving."""
    try:
        script = generate_script(
            task_type="daemon",
            target_script=data.target_script,
            process_name=data.process_name,
            working_dir=data.working_dir,
            env_vars=data.env_vars,
            auto_restart=data.auto_restart,
            restart_delay=data.restart_delay,
            max_restarts=data.max_restarts,
        )
        return {
            "template_id": "daemon",
            "script": script,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate script: {str(e)}")


class SimplePreviewRequest(BaseModel):
    script_content: str = Field(..., description="The script content to wrap")
    working_dir: Optional[str] = ""
    env_vars: Optional[str] = "{}"


@router.post("/simple/preview")
def preview_simple_template(data: SimplePreviewRequest):
    """Preview generated simple script without saving."""
    try:
        script = generate_script(
            task_type="simple",
            script_content=data.script_content,
            working_dir=data.working_dir,
            env_vars=data.env_vars,
        )
        return {
            "template_id": "simple",
            "script": script,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate script: {str(e)}")
