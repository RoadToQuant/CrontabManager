'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  Play, 
  FileCode,
  History,
  Clock,
  Folder,
  Settings,
  Power,
  PowerOff,
} from 'lucide-react';
import { tasksApi, editorApi, logsApi } from '@/lib/api';
import { Task, TaskRun } from '@/types';
import { formatDate } from '@/lib/date';

const CRON_EXAMPLES = [
  { label: '每分钟', value: '* * * * *' },
  { label: '每5分钟', value: '*/5 * * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每天 9:00', value: '0 9 * * *' },
  { label: '每天 0:00', value: '0 0 * * *' },
  { label: '每周一 9:00', value: '0 9 * * 1' },
  { label: '每月1日 9:00', value: '0 9 1 * *' },
];

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = parseInt(params.id as string);
  
  const [task, setTask] = useState<Task | null>(null);
  const [scriptContent, setScriptContent] = useState('');
  const [runs, setRuns] = useState<TaskRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  
  // Editable fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cron, setCron] = useState('');
  const [workingDir, setWorkingDir] = useState('');
  const [envVars, setEnvVars] = useState('');
  const [status, setStatus] = useState('enabled');

  useEffect(() => {
    if (taskId) {
      loadData();
    }
  }, [taskId]);

  const loadData = async () => {
    try {
      const [taskData, runsData] = await Promise.all([
        tasksApi.get(taskId),
        tasksApi.getRuns(taskId),
      ]);
      setTask(taskData);
      setScriptContent(taskData.script_content);
      setRuns(runsData);
      
      // Set editable fields
      setName(taskData.name);
      setDescription(taskData.description || '');
      setCron(taskData.cron);
      setWorkingDir(taskData.working_dir || '');
      setEnvVars(taskData.env_vars || '');
      setStatus(taskData.status);
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await tasksApi.update(taskId, {
        name,
        description,
        cron,
        script_content: scriptContent,
        working_dir: workingDir,
        env_vars: envVars,
      });
      alert('任务已保存并同步到 crontab');
      loadData();
    } catch (error) {
      alert('保存失败: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    try {
      const result = await tasksApi.toggle(taskId);
      setStatus(result.status);
      alert(result.message);
      loadData();
    } catch (error) {
      alert('操作失败: ' + (error as Error).message);
    }
  };

  const handleRun = async () => {
    try {
      setRunning(true);
      await tasksApi.run(taskId);
      setTimeout(() => {
        setRunning(false);
        loadData();
      }, 2000);
    } catch (error) {
      alert('运行失败: ' + (error as Error).message);
      setRunning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      running: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      running: '运行中',
      success: '成功',
      failed: '失败',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.running}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">任务不存在</p>
        <Link href="/" className="text-primary-600 hover:underline mt-2 inline-block">
          返回任务列表
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900">{task.name}</h2>
              {status === 'enabled' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  <Power className="w-3 h-3 mr-1" />
                  已启用
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  <PowerOff className="w-3 h-3 mr-1" />
                  已禁用
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">
              {task.description || '无描述'} · 
              <code className="mx-1 px-1 py-0.5 bg-gray-100 rounded text-xs">{task.cron}</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              status === 'enabled'
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {status === 'enabled' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
            {status === 'enabled' ? '禁用' : '启用'}
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            立即执行
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Left column - Settings and Editor */}
        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-auto">
          {/* Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-700">任务设置</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">任务名称</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Cron 表达式</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cron}
                    onChange={(e) => setCron(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    placeholder="* * * * *"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">工作目录</label>
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={workingDir}
                    onChange={(e) => setWorkingDir(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    placeholder="/path/to/dir"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">环境变量 (JSON)</label>
                <input
                  type="text"
                  value={envVars}
                  onChange={(e) => setEnvVars(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  placeholder='{"KEY": "value"}'
                />
              </div>
            </div>
            
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">描述</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                placeholder="任务描述..."
              />
            </div>
            
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">快捷选择:</span>
              {CRON_EXAMPLES.map((example) => (
                <button
                  key={example.value}
                  type="button"
                  onClick={() => setCron(example.value)}
                  className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Bash 脚本</span>
              </div>
              <span className="text-xs text-gray-400">保存后自动同步到 crontab</span>
            </div>
            <div className="flex-1 min-h-0">
              <textarea
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                className="w-full h-full px-4 py-3 font-mono text-sm bg-gray-50 text-gray-900 focus:outline-none resize-none"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {/* Right sidebar - Run History */}
        <div className="w-80 flex flex-col gap-4">
          <div className="bg-white rounded-lg border border-gray-200 flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">执行记录</span>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {runs.length === 0 ? (
                <p className="text-center text-gray-400 py-8">暂无执行记录</p>
              ) : (
                <div className="space-y-2">
                  {runs.map((run) => (
                    <div
                      key={run.id}
                      className="p-3 rounded-lg border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">#{run.id}</span>
                        {getStatusBadge(run.status)}
                      </div>
                      <p className="text-xs text-gray-400">
                        {formatDate(run.start_time)}
                      </p>
                      {run.exit_code !== null && (
                        <p className="text-xs text-gray-400 mt-1">
                          退出码: {run.exit_code}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Cron Log */}
          <div className="bg-white rounded-lg border border-gray-200 h-64 flex flex-col">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Cron 日志</span>
              </div>
              <Link
                href={`/logs/${taskId}`}
                className="text-xs text-primary-600 hover:underline"
              >
                查看完整
              </Link>
            </div>
            <div className="flex-1 p-2 overflow-auto">
              <p className="text-xs text-gray-400 text-center py-8">
                点击"查看完整"查看 cron 执行日志
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
