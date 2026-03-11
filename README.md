# Crontab Manager

一个基于系统 crontab 的脚本任务管理工具。所有任务都会被转换为 bash 脚本并添加到 crontab 中执行，即使管理器停止，任务仍会按计划执行。

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 特性

- 📝 **可视化 crontab 管理** - 通过 Web 界面管理定时任务
- 🐚 **纯 Bash 执行** - 所有任务统一转换为 bash 脚本
- ⏰ **系统级调度** - 使用系统 crontab，管理器停止不影响任务执行
- 📊 **执行日志** - 查看任务的执行历史和输出
- 🔄 **实时同步** - 任务修改自动同步到 crontab

## 技术栈

- **后端**: Python + FastAPI + SQLAlchemy
- **前端**: Next.js 14 + React + TypeScript + Tailwind CSS
- **调度**: 系统 crontab
- **数据库**: SQLite

## 快速开始

### 系统要求

- Ubuntu 22.04 (推荐)
- Python 3.9+
- Node.js 18+
- cron

### 一键部署

```bash
# 克隆项目
git clone <repository> crontab-manager
cd crontab-manager

# 部署
./deploy.sh

# 启动
./start.sh
```

访问 http://localhost:3000

### 手动安装

```bash
# 后端
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py

# 前端 (新终端)
cd frontend
npm install
npm run dev
```

## 使用说明

### 创建任务

1. 打开 Web 界面
2. 点击 **"新建任务"**
3. 填写任务信息：
   - 名称、描述
   - Cron 表达式（如 `0 9 * * *` 每天9点）
   - Bash 脚本内容
4. 保存并启用

### Cron 表达式格式

```
* * * * *
│ │ │ │ │
│ │ │ │ └── 星期 (0-6, 0=周日)
│ │ │ └──── 月份 (1-12)
│ │ └────── 日期 (1-31)
│ └──────── 小时 (0-23)
└────────── 分钟 (0-59)
```

常用示例：
- `* * * * *` - 每分钟
- `*/5 * * * *` - 每5分钟
- `0 * * * *` - 每小时
- `0 9 * * *` - 每天 9:00
- `0 0 * * 1` - 每周一 0:00

## 项目结构

```
crontab-manager/
├── backend/              # FastAPI 后端
│   ├── api/              # API 路由
│   ├── services/         # 业务逻辑
│   ├── data/             # 数据目录
│   └── main.py           # 入口文件
├── frontend/             # Next.js 前端
│   ├── app/              # 页面路由
│   └── components/       # 组件
├── deploy.sh             # 部署脚本
├── start.sh              # 启动脚本
└── README.md
```

## 开发

### 常用命令

```bash
# 开发模式
make dev

# 代码格式化
make format

# 运行测试
make test

# 构建生产版本
make build

# 数据库重置
make db-reset

# 同步 crontab
make sync
```

### Git 工作流

```bash
# 创建功能分支
git checkout -b feature/xxx

# 提交修改
git add .
git commit -m "feat: 添加新功能"

# 推送
git push origin feature/xxx
```

详见 [CONTRIBUTING.md](CONTRIBUTING.md)

## 配置

编辑 `.env` 文件：

```env
# 后端配置
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Crontab 用户 (留空表示当前用户)
CRONTAB_USER=

# 任务前缀
CRON_TASK_PREFIX=# script-monitor-task:
```

## 工作原理

1. **任务创建** - 用户通过 Web 界面创建任务
2. **脚本生成** - 后端将任务转换为 bash 脚本文件
3. **Crontab 更新** - 将任务添加到系统 crontab
4. **定时执行** - 系统 cron 按计划执行脚本
5. **日志记录** - 输出保存到任务目录的 cron.log

## 更新日志

详见 [CHANGELOG.md](CHANGELOG.md)

## 贡献

欢迎提交 Issue 和 Pull Request！

详见 [CONTRIBUTING.md](CONTRIBUTING.md)

## 许可证

[MIT](LICENSE)
