"""File storage service for scripts."""
from pathlib import Path
from config import get_settings

settings = get_settings()


class FileStorage:
    """Script file storage manager."""
    
    def __init__(self):
        self.scripts_dir = Path(settings.scripts_dir)
    
    def _get_task_dir(self, task_id: int) -> Path:
        """Get task script directory."""
        task_dir = self.scripts_dir / f"task_{task_id}"
        task_dir.mkdir(parents=True, exist_ok=True)
        return task_dir
    
    def get_script_path(self, task_id: int) -> Path:
        """Get script file path."""
        return self._get_task_dir(task_id) / "run.sh"
    
    def get_log_path(self, task_id: int) -> Path:
        """Get log file path."""
        return self._get_task_dir(task_id) / "cron.log"
    
    async def write_script(self, task_id: int, content: str) -> Path:
        """Write script content to file."""
        script_path = self.get_script_path(task_id)
        script_path.write_text(content, encoding='utf-8')
        script_path.chmod(0o755)
        return script_path
    
    def delete_task_scripts(self, task_id: int) -> None:
        """Delete all scripts for a task."""
        import shutil
        task_dir = self._get_task_dir(task_id)
        if task_dir.exists():
            shutil.rmtree(task_dir)
    
    def get_default_template(self) -> str:
        """Get default bash script template."""
        return '''#!/bin/bash

set -e

echo "Script started at $(date '+%Y-%m-%d %H:%M:%S')"

# Your code here
echo "Hello, World!"

echo "Script completed successfully!"
'''


file_storage = FileStorage()
