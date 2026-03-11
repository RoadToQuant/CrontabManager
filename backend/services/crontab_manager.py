"""Crontab management service - crontab as single source of truth."""
import json
import re
import subprocess
import shutil
from pathlib import Path
from typing import List, Optional, Dict
from datetime import datetime

from config import get_settings
from models import Task

settings = get_settings()


class CrontabManager:
    """Manage system crontab entries for script-monitor tasks.
    
    All task data is stored in crontab comments as JSON.
    Format:
    # script-monitor:{"id":1,"name":"Task Name",...}
    * * * * * /path/to/script >> /path/to/log 2>&1
    """
    
    TASK_MARKER_PREFIX = "# script-monitor:"
    
    def __init__(self):
        self.scripts_dir = Path(settings.scripts_dir)
    
    def _get_crontab_content(self) -> str:
        """Get current crontab content."""
        try:
            if settings.crontab_user:
                result = subprocess.run(
                    ["crontab", "-u", settings.crontab_user, "-l"],
                    capture_output=True,
                    text=True,
                    check=False
                )
            else:
                result = subprocess.run(
                    ["crontab", "-l"],
                    capture_output=True,
                    text=True,
                    check=False
                )
            
            if result.returncode == 0:
                return result.stdout
            else:
                return ""
        except Exception as e:
            print(f"Error reading crontab: {e}")
            return ""
    
    def _set_crontab_content(self, content: str) -> bool:
        """Set crontab content."""
        try:
            temp_file = Path("/tmp/script_monitor_crontab.tmp")
            temp_file.write_text(content, encoding='utf-8')
            
            if settings.crontab_user:
                result = subprocess.run(
                    ["crontab", "-u", settings.crontab_user, str(temp_file)],
                    capture_output=True,
                    text=True,
                    check=True
                )
            else:
                result = subprocess.run(
                    ["crontab", str(temp_file)],
                    capture_output=True,
                    text=True,
                    check=True
                )
            
            temp_file.unlink(missing_ok=True)
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"Error setting crontab: {e.stderr}")
            return False
        except Exception as e:
            print(f"Error setting crontab: {e}")
            return False
    
    def _parse_task_from_comment(self, comment_line: str) -> Optional[Dict]:
        """Parse task data from a crontab comment line."""
        stripped = comment_line.strip()
        if not stripped.startswith(self.TASK_MARKER_PREFIX):
            return None
        try:
            json_str = stripped[len(self.TASK_MARKER_PREFIX):]
            return json.loads(json_str)
        except json.JSONDecodeError:
            return None
    
    def _build_task_comment(self, task: Task) -> str:
        """Build a crontab comment line with task data."""
        task_dict = task.to_dict()
        # Don't store script_path in crontab (it's derived from id)
        task_dict.pop('script_path', None)
        return f"{self.TASK_MARKER_PREFIX}{json.dumps(task_dict, ensure_ascii=False)}"
    
    def get_all_tasks(self) -> List[Task]:
        """Get all script-monitor tasks from crontab."""
        content = self._get_crontab_content()
        tasks = []
        
        lines = content.split('\n')
        for line in lines:
            task_data = self._parse_task_from_comment(line)
            if task_data:
                # Add computed script_path
                task_id = task_data.get('id')
                if task_id:
                    task_data['script_path'] = str(self.scripts_dir / f"task_{task_id}" / "run.sh")
                tasks.append(Task(**task_data))
        
        return tasks
    
    def get_task(self, task_id: int) -> Optional[Task]:
        """Get a single task by ID."""
        for task in self.get_all_tasks():
            if task.id == task_id:
                return task
        return None
    
    def _generate_next_id(self) -> int:
        """Generate next available task ID."""
        tasks = self.get_all_tasks()
        if not tasks:
            return 1
        return max(t.id for t in tasks) + 1
    
    def _generate_script_file(self, task_id: int, name: str, content: str,
                              working_dir: str = "", env_vars: str = "{}") -> Path:
        """Generate bash script file for a task."""
        task_script_dir = self.scripts_dir / f"task_{task_id}"
        task_script_dir.mkdir(parents=True, exist_ok=True)
        
        script_file = task_script_dir / "run.sh"
        
        try:
            env_dict = json.loads(env_vars) if env_vars else {}
        except:
            env_dict = {}
        
        script_lines = [
            "#!/bin/bash",
            "",
            f"# Auto-generated by Script Monitor",
            f"# Task: {name}",
            f"# Created: {datetime.now().isoformat()}",
            "",
            "# Set error handling",
            "set -e",
            "",
        ]
        
        if env_dict:
            script_lines.append("# Environment variables")
            for key, value in env_dict.items():
                escaped_value = str(value).replace('"', '\\"')
                script_lines.append(f'export {key}="{escaped_value}"')
            script_lines.append("")
        
        if working_dir:
            script_lines.append(f"# Change to working directory")
            script_lines.append(f'cd "{working_dir}"')
            script_lines.append("")
        
        script_lines.append("# User script")
        script_lines.append(content)
        script_lines.append("")
        
        script_file.write_text("\n".join(script_lines), encoding='utf-8')
        script_file.chmod(0o755)
        
        return script_file
    
    def add_or_update_task(self, task: Task, script_content: str) -> Optional[Path]:
        """Add or update a task in crontab.
        
        Args:
            task: Task model (id can be 0 for new tasks)
            script_content: The bash script content
            
        Returns:
            Path to the script file if successful, None otherwise
        """
        # Assign ID for new tasks
        if task.id is None or task.id == 0:
            task.id = self._generate_next_id()
            if not task.created_at:
                task.created_at = datetime.utcnow().isoformat()
        
        task.updated_at = datetime.utcnow().isoformat()
        
        # Generate script file
        script_path = self._generate_script_file(
            task.id, task.name, script_content,
            task.working_dir or "", task.env_vars or "{}"
        )
        
        # Read current crontab
        content = self._get_crontab_content()
        
        # Remove existing entry for this task
        content = self._remove_task_from_content(task.id, content)
        
        # Build new entry
        task_comment = self._build_task_comment(task)
        log_file = self.scripts_dir / f"task_{task.id}" / "cron.log"
        
        if task.status == "enabled":
            cron_line = f"{task.cron} {script_path} >> {log_file} 2>&1"
        else:
            cron_line = f"# {task.cron} {script_path} >> {log_file} 2>&1"
        
        new_entry = f"{task_comment}\n{cron_line}"
        
        # Add to crontab content
        if content and not content.endswith('\n'):
            content += '\n'
        content += new_entry + '\n'
        
        if self._set_crontab_content(content):
            return script_path
        return None
    
    def _remove_task_from_content(self, task_id: int, content: str) -> str:
        """Remove a task entry from crontab content.
        
        Removes both the comment line and the following cron line.
        """
        lines = content.split('\n')
        result_lines = []
        skip_next = False
        
        for line in lines:
            # Check if this is the target task's comment line
            task_data = self._parse_task_from_comment(line)
            if task_data and task_data.get('id') == task_id:
                skip_next = True  # Skip this line and the next (cron line)
                continue
            
            if skip_next:
                skip_next = False
                continue
            
            result_lines.append(line)
        
        return '\n'.join(result_lines)
    
    def delete_task(self, task_id: int) -> bool:
        """Delete a task from crontab and remove its files."""
        content = self._get_crontab_content()
        content = self._remove_task_from_content(task_id, content)
        
        if self._set_crontab_content(content):
            # Clean up script directory
            task_script_dir = self.scripts_dir / f"task_{task_id}"
            if task_script_dir.exists():
                shutil.rmtree(task_script_dir)
            return True
        return False
    
    def toggle_task(self, task_id: int) -> bool:
        """Toggle task enabled/disabled status."""
        task = self.get_task(task_id)
        if not task:
            return False
        
        # Toggle status
        task.status = "disabled" if task.status == "enabled" else "enabled"
        task.updated_at = datetime.utcnow().isoformat()
        
        # Read existing script content
        script_path = Path(task.script_path) if task.script_path else self.scripts_dir / f"task_{task_id}" / "run.sh"
        script_content = ""
        if script_path.exists():
            script_content = script_path.read_text(encoding='utf-8')
        
        return self.add_or_update_task(task, script_content) is not None
    
    def sync_from_crontab(self) -> Dict:
        """Sync from crontab - cleanup orphan script directories.
        
        Returns format for frontend:
        { "tasks_count": N, "removed_dirs": [1, 2, ...], "errors": [] }
        """
        tasks = self.get_all_tasks()
        valid_ids = {t.id for t in tasks}
        
        removed_dirs = []
        errors = []
        
        # Clean up orphan directories
        if self.scripts_dir.exists():
            for item in self.scripts_dir.iterdir():
                if item.is_dir() and item.name.startswith('task_'):
                    try:
                        task_id = int(item.name.split('_')[1])
                        if task_id not in valid_ids:
                            shutil.rmtree(item)
                            removed_dirs.append(task_id)
                    except (ValueError, IndexError):
                        pass
        
        return {
            "tasks_count": len(tasks),  # Number of tasks read from crontab
            "removed_dirs": removed_dirs,  # Orphan script directories removed
            "errors": errors
        }
    
    def get_task_log(self, task_id: int, lines: int = 100) -> str:
        """Get cron log for a task."""
        log_file = self.scripts_dir / f"task_{task_id}" / "cron.log"
        
        if not log_file.exists():
            return ""
        
        try:
            result = subprocess.run(
                ["tail", "-n", str(lines), str(log_file)],
                capture_output=True,
                text=True,
                check=False
            )
            return result.stdout if result.returncode == 0 else ""
        except Exception as e:
            return f"Error reading log: {e}"
    
    def get_script_path(self, task_id: int) -> Path:
        """Get script file path for a task."""
        return self.scripts_dir / f"task_{task_id}" / "run.sh"


# Global instance
crontab_manager = CrontabManager()
