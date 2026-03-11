'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Loader2, 
  FileText, 
  Shield, 
  Clock,
  Check,
  Eye,
  Terminal,
  Info,
} from 'lucide-react';
import { tasksApi, editorApi, executorsApi, templatesApi } from '@/lib/api';

const CRON_EXAMPLES = [
  { label: '每分钟', value: '* * * * *' },
  { label: '每5分钟', value: '*/5 * * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每天 9:00', value: '0 9 * * *' },
  { label: '每天 0:00', value: '0 0 * * *' },
  { label: '每周一 9:00', value: '0 9 * * 1' },
];

export default function NewTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [taskType, setTaskType] = useState<'simple' | 'daemon'>('simple');
  
  // Common form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cron, setCron] = useState('* * * * *');
  const [workingDir, setWorkingDir] = useState('');
  const [envVars, setEnvVars] = useState('');
  const [status, setStatus] = useState('enabled');
  const [cronValid, setCronValid] = useState(true);
  
  // Simple task form
  const [scriptContent, setScriptContent] = useState('');
  
  // Daemon task form
  const [targetScript, setTargetScript] = useState('');
  const [processName, setProcessName] = useState('');
  const [autoRestart, setAutoRestart] = useState(true);
  const [restartDelay, setRestartDelay] = useState(5);
  const [maxRestarts, setMaxRestarts] = useState(3);
  
  // Preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewScript, setPreviewScript] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

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

  const previewDaemon = async () => {
    if (!targetScript || !processName) {
      alert('请填写目标脚本路径和进程名称');
      return;
    }
    
    setPreviewLoading(true);
    try {
      const result = await templatesApi.previewDaemon({
        target_script: targetScript,
        process_name: processName,
        working_dir: workingDir,
        env_vars: envVars,
        auto_restart: autoRestart,
        restart_delay: restartDelay,
        max_restarts: maxRestarts,
      });
      setPreviewScript(result.script);
      setShowPreview(true);
    } catch (error) {
      alert('预览生成失败: ' + (error as Error).message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const previewSimple = async () => {
    setPreviewLoading(true);
    try {
      const result = await templatesApi.previewSimple({
        script_content: scriptContent,
        working_dir: workingDir,
        env_vars: envVars,
      });
      setPreviewScript(result.script);
      setShowPreview(true);
    } catch (error) {
      alert('预览生成失败: ' + (error as Error).message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cronValid) {
      alert('请检查 Cron 表达式格式');
      return;
    }
    
    if (!name || !cron) {
      alert('请填写任务名称和 Cron 表达式');
      return;
    }
    
    if (taskType === 'daemon') {
      if (!targetScript || !processName) {
        alert('守护进程任务需要填写目标脚本路径和进程名称');
        return;
      }
    } else {
      if (!scriptContent) {
        alert('请填写脚本内容');
        return;
      }
    }
    
    setLoading(true);
    try {
      const taskData: any = {
        name,
        description,
        cron,
        task_type: taskType,
        working_dir: workingDir,
        env_vars: envVars,
        status,
      };
      
      if (taskType === 'daemon') {
        taskData.target_script = targetScript;
        taskData.process_name = processName;
        taskData.auto_restart = autoRestart;
        taskData.restart_delay = restartDelay;
        taskData.max_restarts = maxRestarts;
      } else {
        taskData.script_content = scriptContent;
      }
      
      await tasksApi.create(taskData);
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
          <h2 className="text-2xl font-bold text-gray-900">新建任务</h2>
          <p className="text-gray-500 mt-1">创建一个新的定时任务</p>
        </div>
      </div>

      {/* Task Type Selection - Two Cards */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Simple Task Card */}
        <button
          type="button"
          onClick={() => setTaskType('simple')}
          className={`p-6 rounded-xl border-2 text-left transition-all ${
            taskType === 'simple'
              ? 'border-primary-600 bg-primary-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${
              taskType === 'simple' ? 'bg-primary-100' : 'bg-gray-100'
            }`}>
              <Clock className={`w-6 h-6 ${
                taskType === 'simple' ? 'text-primary-600' : 'text-gray-500'
              }`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold text-lg ${
                  taskType === 'simple' ? 'text-primary-900' : 'text-gray-900'
                }`}>
                  单次执行任务
                </h3>
                {taskType === 'simple' && (
                  <Check className="w-5 h-5 text-primary-600" />
                )}
              </div>
              <p className="text-gray-600 text-sm mb-3">
                按 Cron 表达式定时执行脚本，每次执行完成后退出。
                适合定时备份、数据同步、报告生成等周期性任务。
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• 按 Cron 调度周期性执行</li>
                <li>• 支持编写脚本或选择已有脚本</li>
                <li>• 每次执行独立，互不干扰</li>
              </ul>
            </div>
          </div>
        </button>

        {/* Daemon Task Card */}
        <button
          type="button"
          onClick={() => setTaskType('daemon')}
          className={`p-6 rounded-xl border-2 text-left transition-all ${
            taskType === 'daemon'
              ? 'border-primary-600 bg-primary-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${
              taskType === 'daemon' ? 'bg-primary-100' : 'bg-gray-100'
            }`}>
              <Shield className={`w-6 h-6 ${
                taskType === 'daemon' ? 'text-primary-600' : 'text-gray-500'
              }`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold text-lg ${
                  taskType === 'daemon' ? 'text-primary-900' : 'text-gray-900'
                }`}>
                  守护进程任务
                </h3>
                {taskType === 'daemon' && (
                  <Check className="w-5 h-5 text-primary-600" />
                )}
              </div>
              <p className="text-gray-600 text-sm mb-3">
                包装已有启动脚本，持续监控进程状态，崩溃后自动重启。
                适合需要长期运行的服务，如 Jupyter Server、Web 服务等。
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• PID 跟踪监控进程状态</li>
                <li>• 进程崩溃自动检测并重启</li>
                <li>• 支持最大重启次数限制</li>
              </ul>
            </div>
          </div>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Common Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-gray-400" />
            基础配置
          </h3>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                任务名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                placeholder={taskType === 'daemon' ? "如：Jupyter Server 守护" : "如：每日数据备份"}
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
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-gray-900 bg-white ${
                  cronValid ? 'border-gray-300' : 'border-red-500'
                }`}
                placeholder="* * * * *"
              />
              {!cronValid && (
                <p className="text-xs text-red-500 mt-1">Cron 表达式格式不正确</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                描述
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                placeholder="任务描述（可选）"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                工作目录
              </label>
              <input
                type="text"
                value={workingDir}
                onChange={(e) => setWorkingDir(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white font-mono text-sm"
                placeholder="/path/to/workdir（可选）"
              />
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
                环境变量 (JSON)
              </label>
              <input
                type="text"
                value={envVars}
                onChange={(e) => setEnvVars(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white font-mono text-sm"
                placeholder='{"KEY":"value"}'
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
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

        {/* Task Type Specific Settings */}
        {taskType === 'simple' ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-gray-400" />
                脚本内容
              </h3>
              <button
                type="button"
                onClick={previewSimple}
                disabled={previewLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Eye className="w-4 h-4" />
                预览
              </button>
            </div>
            <textarea
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              className="w-full h-80 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              spellCheck={false}
            />
            <p className="text-xs text-gray-500 mt-2">
              脚本将以 bash 执行，支持所有标准 shell 命令
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-400" />
              守护进程配置
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    目标脚本路径 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={targetScript}
                    onChange={(e) => setTargetScript(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white font-mono text-sm"
                    placeholder="/home/ubuntu/projects/services/start_jupyterserver.sh"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    要守护的启动脚本的完整路径
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    进程名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={processName}
                    onChange={(e) => setProcessName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    placeholder="jupyter"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    用于识别进程的标识名称（pgrep 使用）
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto_restart"
                  checked={autoRestart}
                  onChange={(e) => setAutoRestart(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="auto_restart" className="text-sm text-gray-700">
                  进程崩溃时自动重启
                </label>
              </div>

              {autoRestart && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      重启延迟（秒）
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={restartDelay}
                      onChange={(e) => setRestartDelay(parseInt(e.target.value) || 5)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最大重启次数
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={maxRestarts}
                      onChange={(e) => setMaxRestarts(parseInt(e.target.value) || 3)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">工作原理</h4>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Cron 按计划执行包装脚本</li>
                  <li>脚本检查目标进程是否在运行（通过 PID 文件和进程名双重验证）</li>
                  <li>如果进程运行正常，直接退出等待下次检查</li>
                  <li>如果进程不存在，执行启动脚本并记录新 PID</li>
                  <li>如果配置了自动重启，会在启动失败时重试指定次数</li>
                </ol>
              </div>

              <button
                type="button"
                onClick={previewDaemon}
                disabled={previewLoading || !targetScript || !processName}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <Eye className="w-4 h-4" />
                {previewLoading ? '生成中...' : '预览生成的守护脚本'}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <Link
            href="/"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={loading || !cronValid}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            创建任务
          </button>
        </div>
      </form>

      {/* Script Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">脚本预览</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-900">
              <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">
                {previewScript}
              </pre>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
