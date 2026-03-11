'use client';

import { Terminal, Info } from 'lucide-react';

export default function ExecutorsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">执行器信息</h2>
        <p className="text-gray-500 mt-1">Crontab Manager 使用系统 Bash 执行所有任务</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
          <Terminal className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">Bash / Shell</h3>
          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
            默认
          </span>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">执行器名称</label>
              <p className="text-gray-900 font-medium mt-1">Bash (系统默认)</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">执行命令</label>
              <p className="text-gray-900 font-mono text-sm mt-1">/bin/bash</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">脚本类型</label>
              <p className="text-gray-900 mt-1">Shell / Bash</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">状态</label>
              <p className="text-green-600 font-medium mt-1">● 可用</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">关于执行器</p>
              <p>
                Crontab Manager 将所有任务转换为 Bash 脚本执行。所有脚本都在系统 crontab 中运行，
                确保即使管理器停止，任务也能按计划执行。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">执行器特性</h3>
        </div>
        <div className="p-6">
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>所有任务统一使用 Bash 执行，确保兼容性</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>支持 Python、Node.js 等通过 Bash 包装调用</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>环境变量自动注入脚本</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>工作目录自动切换</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>执行日志自动记录</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
