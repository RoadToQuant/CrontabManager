"""Scheduler module - now just a placeholder for compatibility.

All scheduling is handled by system crontab.
This module provides minimal compatibility layer.
"""
from services.crontab_manager import crontab_manager
from services.file_storage import file_storage


class TaskScheduler:
    """Placeholder scheduler - actual scheduling is done by crontab."""
    
    def __init__(self):
        pass
    
    def start(self):
        """No-op - crontab handles scheduling."""
        print("Scheduler: Using system crontab for task scheduling (sqlite-free)")
    
    def shutdown(self):
        """No-op."""
        pass
    
    def schedule_task(self, task):
        """Add/update task in crontab."""
        # Read script content from file
        script_path = file_storage.get_script_path(task.id)
        if script_path.exists():
            script_content = script_path.read_text(encoding='utf-8')
        else:
            script_content = file_storage.get_default_template()
        
        crontab_manager.add_or_update_task(task, script_content)
    
    def unschedule_task(self, task_id: int):
        """Remove task from crontab."""
        crontab_manager.delete_task(task_id)
    
    def get_job_info(self, task_id: int) -> dict:
        """Get job info from crontab."""
        task = crontab_manager.get_task(task_id)
        if task:
            return {
                "id": task_id,
                "enabled": task.status == "enabled",
                "cron": task.cron
            }
        return None


# Global scheduler instance (for compatibility)
scheduler = TaskScheduler()
