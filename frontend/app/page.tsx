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
} from 'lucide-react';
import { tasksApi } from '@/lib/api';
import { Task } from '@/types';
import { formatDistanceToNow } from '@/lib/date';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTasks, setRunningTasks] = useState<Set<number>>(new Set());

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

  const handleDelete = async (taskId: number) => {
    if (!confirm('确定要删除这个任务吗？这将同时从 crontab 中移除。')) return;
    try {
      await tasksApi.delete(taskId);
      loadTasks();
    } catch (error) {
      alert('Failed to delete task: ' + (error as Error).message);
    }
  };

  const handleSync = async () => {
    try {
      const result = await tasksApi.sync();
      alert(`同步完成！\n新增: ${result.added.length}\n移除: ${result.removed.length}\n更新: ${result.updated.length}`);
      loadTasks();
    } catch (error) {
      alert('Failed to sync: ' + (error as Error).message);
    }
  };

  const getStatusIcon = (task: Task) => {
    if (task.status === 'enabled') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <XCircle className="w-5 h-5 text-gray-400" />;
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
                    {task.status === 'enabled' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Power className="w-3 h-3 mr-1" />
                        已启用
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <PowerOff className="w-3 h-3 mr-1" />
                        已禁用
                      </span>
                    )}
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
                        onClick={() => handleDelete(task.id)}
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
        </ul>
      </div>
    </div>
  );
}
