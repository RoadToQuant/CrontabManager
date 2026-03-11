"""Task execution service - for manual execution only, no database."""
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from models import TaskRun, memory_store
from config import get_settings

settings = get_settings()


class TaskRunner:
    """Task execution manager for manual runs."""
    
    def __init__(self):
        self.running_processes: Dict[int, asyncio.subprocess.Process] = {}
    
    async def run_task(self, task_id: int, task) -> TaskRun:
        """Execute a task manually (not via cron).
        
        Args:
            task_id: The task ID
            task: Task model with script_path
            
        Returns:
            TaskRun with execution results
        """
        # Create run record in memory
        run = memory_store.create_run(task_id)
        
        # Get script path
        script_path = Path(task.script_path) if task.script_path else None
        if not script_path or not script_path.exists():
            from services.file_storage import file_storage
            script_path = file_storage.get_script_path(task_id)
        
        if not script_path.exists():
            run.status = "failed"
            run.end_time = datetime.utcnow().isoformat()
            run.log_output = f"Error: Script file not found: {script_path}"
            run.exit_code = -1
            memory_store.update_run(run)
            raise ValueError(f"Script file not found: {script_path}")
        
        # Start process
        try:
            process = await asyncio.create_subprocess_exec(
                str(script_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT
            )
            
            self.running_processes[run.id] = process
            
            # Read output
            stdout, _ = await process.communicate()
            output = stdout.decode('utf-8', errors='replace')
            
            # Update run record
            run.log_output = output
            run.exit_code = process.returncode
            run.end_time = datetime.utcnow().isoformat()
            run.status = "success" if process.returncode == 0 else "failed"
            memory_store.update_run(run)
            
            # Clean up
            if run.id in self.running_processes:
                del self.running_processes[run.id]
            
            return run
            
        except Exception as e:
            run.status = "failed"
            run.end_time = datetime.utcnow().isoformat()
            run.log_output = f"Error: {str(e)}"
            run.exit_code = -1
            memory_store.update_run(run)
            
            if run.id in self.running_processes:
                del self.running_processes[run.id]
            
            raise
    
    async def stop_task(self, run_id: int) -> bool:
        """Stop a running manual task."""
        if run_id not in self.running_processes:
            return False
        
        process = self.running_processes[run_id]
        try:
            process.terminate()
            await asyncio.wait_for(process.wait(), timeout=5.0)
            
            # Update run record
            run = memory_store.get_run(run_id)
            if run:
                run.status = "stopped"
                run.end_time = datetime.utcnow().isoformat()
                memory_store.update_run(run)
            
            return True
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            return True
        except Exception:
            return False
        finally:
            if run_id in self.running_processes:
                del self.running_processes[run_id]
    
    def is_running(self, run_id: int) -> bool:
        """Check if a task run is still running."""
        return run_id in self.running_processes


# Global instance
task_runner = TaskRunner()
