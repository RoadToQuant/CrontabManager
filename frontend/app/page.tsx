'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Play, 
  Plus, 
  FileEdit, 
  Trash2, 
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Terminal,
  Power,
  PowerOff,
  RefreshCw,
  FileText,
  Pause,
  PlayCircle,
  AlertTriangle,
} from 'lucide-react';
import { tasksApi } from '@/lib/api';
import { Task } from '@/types';
import { formatDistanceToNow } from '@/lib/date';

// Delete options dialog component
function DeleteDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  taskName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (options: { deleteScript: boolean; deleteLog: boolean }) => void;
  taskName: string;
}) {
  const [deleteScript, setDeleteScript] = useState(true);
  const [deleteLog, setDeleteLog] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">删除任务</h3>
        </div>
        <p className="text-gray-600 mb-4">
          确定要删除任务 <span className="font-medium text-gray-900">"{taskName}"</span> 吗？
        </p>
        <p className="text-sm text-gray-500 mb-4">
          此操作将从 crontab 中移除任务记录，以下选项决定如何处理相关文件：
        </p>
        
        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={deleteScript}
              onChange={(e) => setDeleteScript(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <div>
              <p className="font-medium text-gray-900">删除脚本文件</p>
              <p className="text-sm text-gray-500">删除任务的 bash 脚本</p>
            </div>
          </label>
          
          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={deleteLog}
              onChange={(e) => setDeleteLog(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <div>
              <p className="font-medium text-gray-900">删除日志文件</p>
              <p className="text-sm text-gray-500">删除任务的执行日志</p>
            </div>
          </label>
          
          <button
            onClick={() => {
              setDeleteScript(true);
              setDeleteLog(true);
            }}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            全选（删除所有文件）
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm({ deleteScript, deleteLog })}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTasks, setRunningTasks] = useState<Set<number>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; taskId: number | null; taskName: string }>({
    isOpen: false,
    taskId: null,
    taskName: '',
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await tasksApi.list();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async (taskId: number) => {
    try {
      setRunningTasks(prev => new Set(prev).add(taskId));
      await tasksApi.run(taskId);
      setTimeout(() => {
        setRunningTasks(prev => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        loadTasks();
      }, 2000);
    } catch (error) {
      alert('Failed to run task: ' + (error as Error).message);
      setRunningTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleToggle = async (taskId: number) => {
    try {
      await tasksApi.toggle(taskId);
      loadTasks();
    } catch (error) {
      alert('Failed to toggle task: ' + (error as Error).message);
    }
  };

  const handleSuspend = async (taskId: number) => {
    try {
      await tasksApi.suspend(taskId);
      loadTasks();
    } catch (error) {
      alert('Failed to suspend task: ' + (error as Error).message);
    }
  };

  const handleResume = async (taskId: number) => {
    try {
      await tasksApi.resume(taskId);
      loadTasks();
    } catch (error) {
      alert('Failed to resume task: ' + (error as Error).message);
    }
  };

  const openDeleteDialog = (taskId: number, taskName: string) => {
    setDeleteDialog({ isOpen: true, taskId, taskName });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, taskId: null, taskName: '' });
  };

  const handleDelete = async (options: { deleteScript: boolean; deleteLog: boolean }) => {
    if (deleteDialog.taskId === null) return;
    
    try {
      await tasksApi.delete(deleteDialog.taskId, options);
      closeDeleteDialog();
      loadTasks();
    } catch (error) {
      alert('Failed to delete task: ' + (error as Error).message);
    }
  };

  const handleSync = async () => {
    try {
      const result = await tasksApi.sync();
      alert(`同步完成！\n从 crontab 读取任务: ${result.tasks_count}\n清理孤儿目录: ${result.removed_dirs.length}`);
      loadTasks();
    } catch (error) {
      alert('Failed to sync: ' + (error as Error).message);
    }
  };

  const getStatusIcon = (task: Task) => {
    if (task.status === 'enabled') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (task.status === 'suspended') {
      return <Pause className="w-5 h-5 text-yellow-500" />;
    }
    return <XCircle className="w-5 h-5 text-gray-400" />;
  };

  const getStatusBadge = (task: Task) => {
    if (task.status === 'enabled') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Power className="w-3 h-3 mr-1" />
          已启用
        </span>
      );
    } else if (task.status === 'suspended') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Pause className="w-3 h-3 mr-1" />
          已暂停
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <PowerOff className="w-3 h-3 mr-1" />
        已禁用
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Crontab 任务管理</h2>
          <p className="text-gray-500 mt-1">管理系统的定时任务（通过 crontab 执行）</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            同步 Crontab
          </button>
          <Link
            href="/tasks/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建任务
          </Link>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <Terminal className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无任务</h3>
          <p className="text-gray-500 mb-4">创建你的第一个定时任务</p>
          <Link
            href="/tasks/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            新建任务
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">任务</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cron 表达式</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(task)}
                      <div>
                        <p className="font-medium text-gray-900">{task.name}</p>
                        {task.description && (
                          <p className="text-sm text-gray-500">{task.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">{task.cron}</code>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(task)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRun(task.id)}
                        disabled={runningTasks.has(task.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        title="立即执行"
                      >
                        {runningTasks.has(task.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      
                      {/* 暂停/重启按钮 */}
                      {task.status === 'suspended' ? (
                        <button
                          onClick={() => handleResume(task.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="重启任务"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(task.id)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="暂停任务"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* 启用/禁用切换按钮（仅非暂停状态） */}
                      {task.status !== 'suspended' && (
                        <button
                          onClick={() => handleToggle(task.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            task.status === 'enabled'
                              ? 'text-orange-600 hover:bg-orange-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={task.status === 'enabled' ? '禁用' : '启用'}
                        >
                          {task.status === 'enabled' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                      )}
                      
                      <Link
                        href={`/tasks/${task.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <FileEdit className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/logs/${task.id}`}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="查看日志"
                      >
                        <FileText className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => openDeleteDialog(task.id, task.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">关于 Crontab 管理</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>所有任务都会转换为 bash 脚本并添加到系统 crontab</li>
          <li>即使管理器停止，crontab 中的任务仍会按计划执行</li>
          <li>脚本文件保存在 backend/data/scripts/ 目录</li>
          <li>执行日志保存在各任务目录的 cron.log 文件中</li>
          <li><strong>已暂停</strong>的任务保留在 crontab（已注释），可随时重启恢复</li>
        </ul>
      </div>

      {/* Delete Dialog */}
      <DeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        taskName={deleteDialog.taskName}
      />
    </div>
  );
}
