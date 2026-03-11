"""Task models - Pydantic only, no database."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class Task(BaseModel):
    """Task model - all data stored in crontab comments."""
    id: int
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = ""
    cron: str = Field(..., min_length=1, max_length=100)
    script_path: Optional[str] = None  # Runtime computed, not stored
    working_dir: Optional[str] = ""
    env_vars: Optional[str] = "{}"  # JSON string
    status: str = "enabled"  # enabled/disabled
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    def to_dict(self):
        """Convert to dictionary."""
        return self.model_dump()


class TaskRun(BaseModel):
    """Task execution run - stored in memory."""
    id: int
    task_id: int
    status: str = "running"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    log_output: Optional[str] = None
    exit_code: Optional[int] = None
    created_at: Optional[str] = None
    
    def to_dict(self):
        """Convert to dictionary."""
        return self.model_dump()


# In-memory storage for task runs (since we removed database)
class InMemoryStore:
    """Simple in-memory store for task runs."""
    
    def __init__(self):
        self.runs: List[TaskRun] = []
        self._counter = 0
    
    def create_run(self, task_id: int) -> TaskRun:
        """Create a new task run."""
        self._counter += 1
        run = TaskRun(
            id=self._counter,
            task_id=task_id,
            status="running",
            start_time=datetime.utcnow().isoformat(),
            created_at=datetime.utcnow().isoformat(),
        )
        self.runs.append(run)
        return run
    
    def get_run(self, run_id: int) -> Optional[TaskRun]:
        """Get a task run by ID."""
        for run in self.runs:
            if run.id == run_id:
                return run
        return None
    
    def get_task_runs(self, task_id: int, limit: int = 20) -> List[TaskRun]:
        """Get runs for a specific task."""
        task_runs = [r for r in self.runs if r.task_id == task_id]
        # Sort by id desc (newest first) and limit
        task_runs.sort(key=lambda x: x.id, reverse=True)
        return task_runs[:limit]
    
    def update_run(self, run: TaskRun) -> None:
        """Update a task run (in-place)."""
        for i, r in enumerate(self.runs):
            if r.id == run.id:
                self.runs[i] = run
                break


# Global in-memory store instance
memory_store = InMemoryStore()
