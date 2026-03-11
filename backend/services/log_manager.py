"""Log management service."""
from pathlib import Path
from typing import Optional
from config import get_settings

settings = get_settings()


class LogManager:
    """Log file manager for reading cron logs."""
    
    def __init__(self):
        self.scripts_dir = Path(settings.scripts_dir)
    
    def get_log_path(self, task_id: int) -> Path:
        """Get log file path for a task."""
        return self.scripts_dir / f"task_{task_id}" / "cron.log"
    
    def read_log(self, task_id: int, tail_lines: int = 100) -> str:
        """Read log file content."""
        log_file = self.get_log_path(task_id)
        
        if not log_file.exists():
            return ""
        
        try:
            import subprocess
            result = subprocess.run(
                ["tail", "-n", str(tail_lines), str(log_file)],
                capture_output=True,
                text=True,
                check=False
            )
            return result.stdout if result.returncode == 0 else ""
        except Exception as e:
            return f"Error reading log: {e}"
    
    def get_log_size(self, task_id: int) -> int:
        """Get log file size."""
        log_file = self.get_log_path(task_id)
        if log_file.exists():
            return log_file.stat().st_size
        return 0
    
    def clear_log(self, task_id: int) -> bool:
        """Clear log file."""
        log_file = self.get_log_path(task_id)
        try:
            if log_file.exists():
                log_file.write_text("")
            return True
        except Exception:
            return False


log_manager = LogManager()
