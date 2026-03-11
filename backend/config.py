"""Configuration management."""
import os
from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Backend
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    
    # Database
    database_url: str = "sqlite:///./data/monitor.db"
    
    # Data directories
    data_dir: str = "./data"
    scripts_dir: str ="./data/scripts"
    
    # Crontab user (empty means current user, 'root' for system crontab)
    crontab_user: str = ""
    
    # Script file prefix in crontab (for识别和管理)
    cron_task_prefix: str = "# script-monitor-task:"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure absolute paths
        base_path = Path(__file__).parent
        self.data_dir = str(base_path / self.data_dir)
        self.scripts_dir = str(base_path / self.scripts_dir)
        
        # Create directories
        Path(self.data_dir).mkdir(parents=True, exist_ok=True)
        Path(self.scripts_dir).mkdir(parents=True, exist_ok=True)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
