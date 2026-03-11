'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Cpu,
  Terminal
} from 'lucide-react';
import { executorsApi } from '@/lib/api';
import { Executor } from '@/types';

const SCRIPT_TYPES = [
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'shell', label: 'Shell/Bash', icon: '🐚' },
  { value: 'powershell', label: 'PowerShell', icon: '⚡' },
];

export default function ExecutorsPage() {
  const [executors, setExecutors] = useState<Executor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    type: 'python',
    command: '',
    args: '',
    is_default: false,
  });

  useEffect(() => {
    loadExecutors();
  }, []);

  const loadExecutors = async () => {
    try {
      const data = await executorsApi.list();
      setExecutors(data);
    } catch (error) {
      console.error('Failed to load executors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await executorsApi.update(editingId, formData);
      } else {
        await executorsApi.create(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ id: '', name: '', type: 'python', command: '', args: '', is_default: false });
      loadExecutors();
    } catch (error) {
      alert('保存失败: ' + (error as Error).message);
    }
  };

  const handleEdit = (executor: Executor) => {
    setEditingId(executor.id);
    setFormData({
      id: executor.id,
      name: executor.name,
      type: executor.type,
      command: executor.command,
      args: executor.args || '',
      is_default: executor.is_default,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个执行器吗？')) return;
    try {
      await executorsApi.delete(id);
      loadExecutors();
    } catch (error) {
      alert('删除失败: ' + (error as Error).message);
    }
  };

  const handleSetDefault = async (executor: Executor) => {
    try {
      await executorsApi.update(executor.id, { is_default: true });
      loadExecutors();
    } catch (error) {
      alert('设置默认失败: ' + (error as Error).message);
    }
  };

  const groupedExecutors = SCRIPT_TYPES.map(type => ({
    ...type,
    items: executors.filter(e => e.type === type.value),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">执行器管理</h2>
          <p className="text-gray-500 mt-1">配置脚本执行环境</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ id: '', name: '', type: 'python', command: '', args: '', is_default: false });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加执行器
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              {editingId ? '编辑执行器' : '添加执行器'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.id}
                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="如: python311"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="如: Python 3.11"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {SCRIPT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  执行路径 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.command}
                  onChange={e => setFormData({ ...formData, command: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  placeholder="如: python 或 C:\Python311\python.exe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  参数（可选）
                </label>
                <input
                  type="text"
                  value={formData.args}
                  onChange={e => setFormData({ ...formData, args: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  placeholder="如: -u"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="is_default" className="text-sm text-gray-700">
                  设为默认执行器
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {groupedExecutors.map(group => (
          <div key={group.value} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <span className="text-xl">{group.icon}</span>
              <h3 className="font-semibold text-gray-900">{group.label}</h3>
              <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                {group.items.length}
              </span>
            </div>
            {group.items.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400">
                <Cpu className="w-8 h-8 mx-auto mb-2" />
                <p>暂无执行器</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {group.items.map(executor => (
                  <div key={executor.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{executor.name}</p>
                          {executor.is_default && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              默认
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 font-mono mt-0.5">
                          {executor.command} {executor.args}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!executor.is_default && (
                        <button
                          onClick={() => handleSetDefault(executor)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="设为默认"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(executor)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(executor.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
