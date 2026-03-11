import { Task, TaskRun, Executor, SystemSettings, StorageStats, FileListResponse } from '@/types';

const API_BASE = '/api';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// Tasks API
export const tasksApi = {
  list: () => fetchApi<Task[]>('/tasks'),
  get: (id: number) => fetchApi<Task>(`/tasks/${id}`),
  create: (data: Partial<Task> & { 
    task_type?: 'simple' | 'daemon';
    script_content?: string;
    target_script?: string;
    process_name?: string;
    auto_restart?: boolean;
    restart_delay?: number;
    max_restarts?: number;
  }) => fetchApi<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: Partial<Task> & { script_content?: string }) => fetchApi<Task>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number, options?: { deleteScript?: boolean; deleteLog?: boolean }) => fetchApi<void>(`/tasks/${id}`, {
    method: 'DELETE',
    body: options ? JSON.stringify(options) : undefined,
  }),
  run: (id: number) => fetchApi<{ message: string; run: TaskRun }>(`/tasks/${id}/run`, {
    method: 'POST',
  }),
  toggle: (id: number) => fetchApi<{ message: string; status: string }>(`/tasks/${id}/toggle`, {
    method: 'POST',
  }),
  suspend: (id: number) => fetchApi<{ message: string; status: string }>(`/tasks/${id}/suspend`, {
    method: 'POST',
  }),
  resume: (id: number) => fetchApi<{ message: string; status: string }>(`/tasks/${id}/resume`, {
    method: 'POST',
  }),
  getRuns: (id: number) => fetchApi<TaskRun[]>(`/tasks/${id}/runs`),
  getCronLog: (id: number, lines?: number) => fetchApi<{ log: string }>(`/tasks/${id}/cron-log?lines=${lines || 100}`),
  sync: () => fetchApi<{ tasks_count: number; removed_dirs: number[]; errors: string[] }>('/tasks/sync', {
    method: 'POST',
  }),
};

// Script Editor API
export const editorApi = {
  getScript: (taskId: number) => fetchApi<{
    task_id: number;
    content: string;
    name: string;
  }>(`/tasks/${taskId}/script`),
  updateScript: (taskId: number, content: string) => fetchApi<{
    message: string;
  }>(`/tasks/${taskId}/script`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  }),
  getTemplate: () => fetchApi<{ content: string }>('/tasks/template'),
};

// Logs API
export const logsApi = {
  getTaskLog: (taskId: number, lines?: number) => fetchApi<{
    task_id: number;
    log: string;
    lines: number;
  }>(`/logs/task/${taskId}?lines=${lines || 100}`),
  getLogSize: (taskId: number) => fetchApi<{
    task_id: number;
    size_bytes: number;
    size_kb: number;
  }>(`/logs/task/${taskId}/size`),
  clearLog: (taskId: number) => fetchApi<{ message: string }>(`/logs/task/${taskId}/clear`, {
    method: 'POST',
  }),
  getRunLog: (runId: number) => fetchApi<{
    run_id: number;
    task_id: number;
    status: string;
    log: string;
    exit_code?: number;
    start_time?: string;
    end_time?: string;
  }>(`/logs/run/${runId}`),
};

// Executors API
export const executorsApi = {
  getInfo: () => fetchApi<Executor>('/executors'),
  validateCron: (cron: string) => fetchApi<{ valid: boolean; cron?: string; error?: string }>(`/executors/validate-cron?cron=${encodeURIComponent(cron)}`),
};

// Templates API
export const templatesApi = {
  list: () => fetchApi<{ templates: Array<{ id: string; name: string; description: string; features: string[] }> }>('/templates'),
  previewDaemon: (params: {
    target_script: string;
    process_name: string;
    working_dir?: string;
    env_vars?: string;
    auto_restart?: boolean;
    restart_delay?: number;
    max_restarts?: number;
  }) => fetchApi<{ template_id: string; script: string }>('/templates/daemon/preview', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
  previewSimple: (params: {
    script_content: string;
    working_dir?: string;
    env_vars?: string;
  }) => fetchApi<{ template_id: string; script: string }>('/templates/simple/preview', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
};

// Settings API
export const settingsApi = {
  get: () => fetchApi<{ settings: Record<string, string>; system: SystemSettings }>('/settings'),
  getRawCrontab: () => fetchApi<{ content: string }>('/settings/crontab/raw'),
  syncCrontab: () => fetchApi<{ tasks_count: number; removed_dirs: number[]; errors: string[] }>('/settings/crontab/sync', {
    method: 'POST',
  }),
};

// File Browser API
export const filesApi = {
  browse: (path?: string) => fetchApi<FileListResponse>(`/files/browse${path ? `?path=${encodeURIComponent(path)}` : ''}`),
  getHome: () => fetchApi<{ home: string; username: string }>('/files/home'),
  validatePath: (path: string) => fetchApi<{
    path: string;
    exists: boolean;
    is_file: boolean;
    is_dir: boolean;
    is_executable: boolean;
    is_in_home: boolean;
    valid: boolean;
    error?: string;
  }>(`/files/validate?path=${encodeURIComponent(path)}`),
};
