export interface Task {
  id: number;
  name: string;
  description?: string;
  cron: string;
  task_type?: 'inline' | 'file';
  script_source_path?: string;
  script_path?: string;
  script_content?: string;
  custom_log_path?: string;
  working_dir?: string;
  env_vars?: string;
  status: 'enabled' | 'disabled' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface TaskRun {
  id: number;
  task_id: number;
  status: 'running' | 'success' | 'failed';
  start_time: string;
  end_time?: string;
  log_output?: string;
  exit_code?: number;
  created_at: string;
}

export interface Executor {
  type: 'bash';
  command: 'bash';
  description: string;
  shell: string;
}

export interface SystemSettings {
  crontab_user: string;
  cron_task_prefix: string;
  scripts_dir: string;
}

export interface StorageStats {
  logs: {
    file_count: number;
    size_mb: number;
  };
  database: {
    size_mb: number;
  };
  scripts: {
    file_count: number;
    size_mb: number;
  };
  total_mb: number;
}

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  is_executable: boolean;
}

export interface FileListResponse {
  current_path: string;
  parent_path?: string;
  items: FileItem[];
}
