'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Terminal, Database, HardDrive } from 'lucide-react';
import { settingsApi } from '@/lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [system, setSystem] = useState<any>({});
  const [rawCrontab, setRawCrontab] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsApi.get();
      setSettings(data.settings);
      setSystem(data.system);
      
      // Load raw crontab
      const crontab = await settingsApi.getRawCrontab();
      setRawCrontab(crontab.content);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await settingsApi.syncCrontab();
      alert(`同步完成！\n从 crontab 读取任务: ${result.tasks_count}\n清理孤儿目录: ${result.removed_dirs.length}`);
      loadSettings();
    } catch (error) {
      alert('同步失败: ' + (error as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">系统设置</h2>
        <p className="text-gray-500 mt-1">管理 Crontab 和系统配置</p>
      </div>

      <div className="space-y-6">
        {/* System Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-medium text-gray-900">系统信息</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Crontab 用户</p>
              <p className="text-lg font-medium text-gray-900">{system.crontab_user || '当前用户'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">任务前缀</p>
              <p className="text-lg font-medium text-gray-900">{system.cron_task_prefix}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">脚本目录</p>
              <p className="text-sm font-medium text-gray-900 font-mono">{system.scripts_dir}</p>
            </div>
          </div>
        </div>

        {/* Crontab Sync */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-medium text-gray-900">Crontab 同步</h3>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {syncing && <RefreshCw className="w-4 h-4 animate-spin" />}
              立即同步
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            将数据库中的任务与系统 crontab 同步。这会：
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside mb-4">
            <li>将数据库中启用的任务添加到 crontab</li>
            <li>从 crontab 中移除数据库中不存在的任务</li>
            <li>更新已存在任务的 cron 表达式和脚本内容</li>
          </ul>
        </div>

        {/* Raw Crontab */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-medium text-gray-900">当前 Crontab</h3>
          </div>
          
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-xs text-gray-400">crontab -l</span>
            </div>
            <pre className="p-4 font-mono text-sm text-gray-300 overflow-auto max-h-96">
              {rawCrontab || '(空)'}
            </pre>
          </div>
        </div>

        {/* About */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">关于 Script Monitor</h3>
          <p className="text-sm text-blue-700 mb-4">
            这是一个基于系统 crontab 的脚本任务管理工具。所有任务都会被转换为 bash 脚本
            并添加到 crontab 中执行，即使管理器停止，任务仍会按计划执行。
          </p>
          <div className="text-sm text-blue-600 space-y-1">
            <p>• 脚本文件保存在: {system.scripts_dir}</p>
            <p>• 执行日志保存在各任务目录的 cron.log 文件中</p>
            <p>• 使用标准的 crontab 语法: 分 时 日 月 星期</p>
          </div>
        </div>
      </div>
    </div>
  );
}
