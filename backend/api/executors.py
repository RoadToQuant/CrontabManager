"""Executors API routes - simplified for bash-only execution."""
from fastapi import APIRouter

router = APIRouter()


@router.get("")
def get_executor_info():
    """Get executor information - all tasks use bash."""
    return {
        "type": "bash",
        "command": "bash",
        "description": "All tasks are executed as bash scripts via crontab",
        "shell": "/bin/bash"
    }


@router.get("/validate-cron")
def validate_cron(cron: str):
    """Validate a cron expression."""
    import re
    
    # Basic cron validation (5 fields: minute hour day month day_of_week)
    pattern = r"^([0-9,\-\*/]+)\s+([0-9,\-\*/]+)\s+([0-9,\-\*/]+)\s+([0-9,\-\*/]+)\s+([0-6,\-\*/]+)$"
    
    if re.match(pattern, cron.strip()):
        return {"valid": True, "cron": cron}
    else:
        return {"valid": False, "error": "Invalid cron format. Expected: minute hour day month day_of_week"}
