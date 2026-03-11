"""Task execution service - for manual execution only."""
import asyncio
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional
from sqlalchemy.orm import Session

from models import Task, TaskRun
from config import get_settings

settings = get_settings()


class TaskRunner:
    """Task execution manager for manual runs."""
    
    def __init__(self):
        self.running_tasks: Dict[int, asyncio.subprocess.Process] = {}
    
    async def run_task(self, db: Session, task_id: int) -> TaskRun:
        """Execute a task manually (not via cron)."""
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise ValueError("Task not found")
        
        # Check if already running
        if task_id in self.running_tasks:
            raise ValueError("Task is already running")
        
        # Create run record
        run = TaskRun(
            task_id=task.id,
            status="running",
            log_output="",
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        
        # Get script path
        from services.file_storage import file_storage
        script_path = Path(task.script_path) if task.script_path else None
        if not script_path or not script_path.exists():
            script_path = file_storage.get_script_path(task_id)
        
        # Start process
        try:
            process = await asyncio.create_subprocess_exec(
                str(script_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT
            )
            
            self.running_tasks[run.id] = process
            
            # Read output
            stdout, _ = await process.communicate()
            output = stdout.decode('utf-8', errors='replace')
            
            # Update run record
            run.log_output = output
            run.exit_code = process.returncode
            run.end_time = datetime.utcnow()
            run.status = "success" if process.returncode == 0 else "failed"
            db.commit()
            
            # Clean up
            if run.id in self.running_tasks:
                del self.running_tasks[run.id]
            
            return run
            
        except Exception as e:
            run.status = "failed"
            run.end_time = datetime.utcnow()
            run.log_output = f"Error: {str(e)}"
            db.commit()
            
            if run.id in self.running_tasks:
                del self.running_tasks[run.id]
            
            raise
    
    async def stop_task(self, run_id: int) -> bool:
        """Stop a running manual task."""
        if run_id not in self.running_tasks:
            return False
        
        process = self.running_tasks[run_id]
        try:
            process.terminate()
            await asyncio.wait_for(process.wait(), timeout=5.0)
            return True
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            return True
        except Exception:
            return False
        finally:
            if run_id in self.running_tasks:
                del self.running_tasks[run_id]
    
    def is_running(self, run_id: int) -> bool:
        """Check if a task run is still running."""
        return run_id in self.running_tasks


# Global instance
task_runner = TaskRunner()
