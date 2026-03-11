'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Folder, FileText, ChevronRight, ChevronUp, Check, Home } from 'lucide-react';
import { tasksApi, editorApi, executorsApi, filesApi } from '@/lib/api';
import { FileItem } from '@/types';

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
  const [taskType, setTaskType] = useState<'inline' | 'file'>('inline');
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cron, setCron] = useState('');
  const [scriptContent, setScriptContent] = useState('');
  const [scriptSourcePath, setScriptSourcePath] = useState('');
  const [customLogPath, setCustomLogPath] = useState('');
  const [workingDir, setWorkingDir] = useState('');
  const [envVars, setEnvVars] = useState('');
  const [status, setStatus] = useState('enabled');
  const [cronValid, setCronValid] = useState(true);
  
  // File browser state
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [homePath, setHomePath] = useState('');
  const [pathValidation, setPathValidation] = useState<{valid: boolean; error?: string}>({ valid: false });

  // Load default template and home path
  useEffect(() => {
    loadTemplate();
    loadHomePath();
  }, []);

  // Load files when showing file browser
  useEffect(() => {
    if (showFileBrowser) {
      loadFiles(currentPath);
    }
  }, [showFileBrowser, currentPath]);

  // Validate script path when changed
  useEffect(() => {
    if (scriptSourcePath && taskType === 'file') {
      validateScriptPath(scriptSourcePath);
    }
  }, [scriptSourcePath, taskType]);

  const loadTemplate = async () => {
    try {
      const data = await editorApi.getTemplate();
      setScriptContent(data.content);
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const loadHomePath = async () => {
    try {
      const data = await filesApi.getHome();
      setHomePath(data.home);
      setCurrentPath(data.home);
    } catch (error) {
      console.error('Failed to load home path:', error);
    }
  };

  const loadFiles = async (path: string) => {
    try {
      const data = await filesApi.browse(path);
      setFiles(data.items);
      setCurrentPath(data.current_path);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
 ;
  };

  const validateScriptPath = async (path: string) => {
    try {
      const result = await filesApi.validatePath(path);
      setPathValidation({
        valid: result.valid,
        error: result.exists ? (result.is_executable ? undefined : '文件没有执行权限') : '文件不存在'
      });
    } catch (error) {
      setPathValidation({ valid: false, error: '路径验证失败' });
    }
  };

  const handleSelectFile = (file: FileItem) => {
    if (file.type === 'directory') {
      loadFiles(file.path);
    } else if (file.type === 'file' && file.is_executable) {
      setScriptSourcePath(file.path);
      // Auto-fill name if empty
      if (!name) {
        setName(file.name);
      }
      setShowFileBrowser(false);
    }
  };

  const handleGoToParent = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || homePath;
    loadFiles(parent);
  };

  const handleGoHome = () => {
    loadFiles(homePath);
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
    if (taskType === 'file' && !pathValidation.valid) {
      alert('请检查脚本文件路径');
      return;
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
      
      if (taskType === 'inline') {
        taskData.script_content = scriptContent;
      } else {
        taskData.script_source_path = scriptSourcePath;
      }
      
      if (customLogPath) {
        taskData.custom_log_path = customLogPath;
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
          <h2 className="text-2xl font-bold text-gray-900">新建 Crontab 任务</h2>
          <p className="text-gray-500 mt-1">创建一个新的定时任务</p>
        </div>
      </div>

      {/* Task Type Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">任务类型</label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setTaskType('inline')}
            className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
              taskType === 'inline'
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <FileText className={`w-6 h-6 ${taskType === 'inline' ? 'text-primary-600' : 'text-gray-400'}`} />
            <div className="text-left">
              <p className={`font-medium ${taskType === 'inline' ? 'text-primary-900' : 'text-gray-700'}`}>
                编写脚本
              </p>
              <p className="text-xs text-gray-500">在编辑器中编写 bash 脚本</p>
            </div>
          </button>
          
          <button
            type="button"
            onClick={() => setTaskType('file')}
            className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
              taskType === 'file'
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Folder className={`w-6 h-6 ${taskType === 'file' ? 'text-primary-600' : 'text-gray-400'}`} />
            <div className="text-left">
              <p className={`font-medium ${taskType === 'file' ? 'text-primary-900' : 'text-gray-700'}`}>
                已有脚本
              </p>
              <p className="text-xs text-gray-500">选择本地已有的脚本文件</p>
            </div>
          </button>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    自定义日志路径（可选）
                  </label>
                  <input
                    type="text"
                    value={customLogPath}
                    onChange={(e) => setCustomLogPath(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white font-mono text-sm"
                    placeholder="/path/to/custom.log（留空使用默认路径）"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    留空则保存到 data/scripts/task_*/cron.log
                  </p>
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

          {/* Right column - Script content or File selector */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {taskType === 'inline' ? (
              <>
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
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-4">选择脚本文件</h3>
                
                {/* Script path input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    脚本文件路径 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required={taskType === 'file'}
                      value={scriptSourcePath}
                      onChange={(e) => setScriptSourcePath(e.target.value)}
                      className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white font-mono text-sm ${
                        pathValidation.valid ? 'border-green-500' : scriptSourcePath ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="/path/to/script.sh"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFileBrowser(true)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Folder className="w-5 h-5" />
                    </button>
                  </div>
                  {scriptSourcePath && (
                    <p className={`text-xs mt-1 ${pathValidation.valid ? 'text-green-600' : 'text-red-500'}`}>
                      {pathValidation.valid ? '✓ 文件有效且可执行' : pathValidation.error || '路径无效'}
                    </p>
                  )}
                </div>

                {/* File Browser Modal */}
                {showFileBrowser && (
                  <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                    {/* File browser header */}
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-300">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleGoHome}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Home"
                        >
                          <Home className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          type="button"
                          onClick={handleGoToParent}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="上级目录"
                        >
                          <ChevronUp className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="text-sm text-gray-600 font-mono truncate max-w-xs">
                          {currentPath}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFileBrowser(false)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        关闭
                      </button>
                    </div>

                    {/* File list */}
                    <div className="max-h-64 overflow-y-auto">
                      {files.map((file) => (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => handleSelectFile(file)}
                          className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors text-left ${
                            file.type === 'file' && !file.is_executable ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={file.type === 'file' && !file.is_executable}
                        >
                          {file.type === 'directory' ? (
                            <Folder className="w-5 h-5 text-yellow-500" />
                          ) : file.is_executable ? (
                            <FileText className="w-5 h-5 text-green-500" />
                          ) : (
                            <FileText className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="flex-1 text-sm text-gray-700">{file.name}</span>
                          {file.type === 'file' && file.is_executable && (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                          {file.type === 'directory' && (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">说明</h4>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>选择服务器上已有的可执行脚本文件</li>
                    <li>脚本需要有执行权限 (chmod +x)</li>
                    <li>系统会创建一个包装脚本来设置环境变量和工作目录</li>
                    <li>原始脚本不会被修改</li>
                  </ul>
                </div>
              </>
            )}
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
            disabled={loading || !cronValid || (taskType === 'file' && !pathValidation.valid)}
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
