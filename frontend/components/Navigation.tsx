'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  PlayCircle, 
  Settings, 
  Terminal,
  Clock
} from 'lucide-react';

const navItems = [
  { href: '/', label: '任务管理', icon: PlayCircle },
  { href: '/settings', label: '系统设置', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary-600" />
          Crontab Manager
        </h1>
        <p className="text-xs text-gray-500 mt-1">脚本任务管理工具</p>
      </div>
      
      <div className="flex-1 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 mx-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-700">系统信息</p>
          <p>所有任务通过 crontab 执行</p>
          <p>管理器停止不影响任务运行</p>
        </div>
      </div>
    </nav>
  );
}
