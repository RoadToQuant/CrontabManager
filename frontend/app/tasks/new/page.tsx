'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { tasksApi, editorApi, executorsApi } from '@/lib/api';

const CRON_EXAMPLES = [
  { label: '每分钟', value: '* * * * *' },
  { label: '每5分钟', value: '*/5 * * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每天 9:00', value: '0 9 * * *' },
  { label: '每天 0:00', value: '0 0 * * *' },
  { label: '每周一 9:00', value: '0 9 * * 1' },
  { label: '每月1日 9:00', value: '0 9 1 * *' },
];

export default function NewTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cron, setCron] = useState('');
  const [scriptContent, setScriptContent] = useState('');
  const [workingDir, setWorkingDir] = useState('');
  const [envVars, setEnvVars] = useState('');
  const [status, setStatus] = useState('enabled');
  const [cronValid, setCronValid] = useState(true);

  // Load default template
  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      const data = await editorApi.getTemplate();
      setScriptContent(data.content);
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const validateCron = async (value: string) => {
    if (!value) {
      setCronValid(true);
      return;
    }
    try {
      const result = await executorsApi.validateCron(value);
      setCronValid(result.valid);
    } catch {
      setCronValid(false);
    }
  };

  const handleCronChange = (value: string) => {
    setCron(value);
    validateCron(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cronValid) {
      alert('请检查 Cron 表达式格式');
      return;
    }
    setLoading(true);
    try {
      await tasksApi.create({
        name,
        description,
        cron,
        script_content: scriptContent,
        working_dir: workingDir,
        env_vars: envVars,
        status,
      });
      router.push('/');
    } catch (error) {
      alert('创建失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/"
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">新建 Crontab 任务</h2>
          <p className="text-gray-500 mt-1">创建一个新的定时任务（bash 脚本）</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Left column - Basic info */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    任务名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="输入任务名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    描述
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                    rows={2}
                    placeholder="输入任务描述（可选）"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cron 表达式 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cron}
                    onChange={(e) => handleCronChange(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-gray-900 bg-white ${
                      cronValid ? 'border-gray-300' : 'border-red-500'
                    }`}
                    placeholder="* * * * *"
                  />
                  {!cronValid && (
                    <p className="text-xs text-red-500 mt-1">Cron 表达式格式不正确</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    格式: 分 时 日 月 星期 (0-59 0-23 1-31 1-12 0-6)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    快捷选择
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CRON_EXAMPLES.map((example) => (
                      <button
                        key={example.value}
                        type="button"
                        onClick={() => handleCronChange(example.value)}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                      >
                        {example.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    工作目录
                  </label>
                  <input
                    type="text"
                    value={workingDir}
                    onChange={(e) => setWorkingDir(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="/path/to/working/dir（可选）"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    环境变量 (JSON 格式)
                  </label>
                  <textarea
                    value={envVars}
                    onChange={(e) => setEnvVars(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white font-mono text-sm"
                    rows={3}
                    placeholder='{"KEY": "value", "API_KEY": "secret"}'
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={status === 'enabled'}
                    onChange={(e) => setStatus(e.target.checked ? 'enabled' : 'disabled')}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="enabled" className="text-sm text-gray-700">
                    立即启用（添加到 crontab）
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Script editor */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bash 脚本内容</h3>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <textarea
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                className="w-full h-96 px-4 py-3 font-mono text-sm bg-gray-50 text-gray-900 focus:outline-none resize-none"
                spellCheck={false}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              脚本将以 bash 执行，支持所有标准 shell 命令
            </p>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Link
            href="/"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={loading || !cronValid}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            创建任务
          </button>
        </div>
      </form>
    </div>
  );
}
