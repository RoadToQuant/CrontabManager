# Crontab Manager

**中文** | [English](./README.en.md)

一个基于系统 crontab 的脚本任务管理工具。所有任务都会被转换为 bash 脚本并添加到 crontab 中执行，即使管理器停止，任务仍会按计划执行。

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.1-blue.svg)](./VERSION)

## 特性

- 📝 **可视化 crontab 管理** - 通过 Web 界面管理定时任务
- 🐚 **纯 Bash 执行** - 所有任务统一转换为 bash 脚本
- 🔄 **两种任务类型** - 单次执行任务 和 守护进程任务（自动重启）
- ⏸️ **任务暂停** - 暂停任务而不从 crontab 中移除
- ⏰ **系统级调度** - 使用系统 crontab，管理器停止不影响任务执行
- 📊 **执行日志** - 查看任务的执行历史和输出
- 🗑️ **选择性删除** - 删除时可选择保留或删除脚本和日志
- 🔄 **实时同步** - 任务修改自动同步到 crontab

## 技术栈

- **后端**: Python + FastAPI + Pydantic
- **前端**: Next.js 14 + React + TypeScript + Tailwind CSS
- **调度**: 系统 crontab
- **存储**: 以 crontab 为单一数据源（无数据库）

## 快速开始

### 系统要求

- Ubuntu 22.04 (推荐)
- Python 3.9+
- Node.js 18+
- cron

### 一键部署

#### 方式一：使用现有 Python 环境（推荐）

如果你已有配置好的 conda 或 venv 环境：

```bash
# 克隆项目
git clone https://github.com/RoadToQuant/CrontabManager.git
cd CrontabManager

# 配置环境（指定你的 Python 环境）
cp .env.example .env

# 编辑 .env，设置你的环境：
# 方式 A：使用 conda
# PYTHON_ENV_TYPE=conda
# CONDA_ACTIVATE=/home/ubuntu/miniconda3/bin/activate
# CONDA_ENV=py39-sm
#
# 方式 B：使用 venv
# PYTHON_ENV_TYPE=venv
# VENV_ACTIVATE=venv/bin/activate

# 部署（自动检测环境，跳过创建）
./deploy.sh

# 启动服务
./start_dev.sh
```

#### 方式二：自动创建新环境

如果你没有 Python 环境，deploy.sh 会自动创建：

```bash
# 克隆项目
git clone https://github.com/RoadToQuant/CrontabManager.git
cd CrontabManager

# 部署（自动创建 venv）
./deploy.sh

# 启动服务
./start_dev.sh
```

#### 部署选项

```bash
./deploy.sh              # 自动检测：使用现有环境或创建新的
./deploy.sh --fresh      # 强制创建新的虚拟环境（删除旧的）
./deploy.sh --conda      # 使用 conda 环境（需提前配置 .env）
./deploy.sh --venv       # 使用 venv（默认）
```

访问 http://localhost:3000 （或你配置的 FRONTEND_PORT）

### 手动安装

```bash
# 后端
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py

# 前端（新终端）
cd frontend
npm install
npm run dev
```

## 使用指南

### 创建任务

#### 任务类型 1：单次执行任务

适用于每个调度周期执行一次然后退出的任务。适合定时备份、数据同步、报告等。

**步骤：**

1. 点击 **"新建任务"**
2. 选择 **"单次执行任务"** 类型
3. 填写基本信息：
   - **任务名称**：`每日备份`
   - **描述**：`每天凌晨2点备份数据`
   - **Cron 表达式**：`0 2 * * *`（每天凌晨2点）
4. 编写 bash 脚本：

```bash
#!/bin/bash

echo "========================================"
echo "备份开始时间: $(date)"
echo "========================================"

# 备份数据
tar -czf /backup/data_$(date +%Y%m%d).tar.gz /home/ubuntu/data/

echo "备份完成时间: $(date)"
echo "========================================"
```

5. （可选）设置工作目录和环境变量
6. 勾选 **"立即启用"**
7. 点击 **"创建任务"**

#### 任务类型 2：守护进程任务

用于将现有脚本包装为守护进程。监控进程状态，崩溃后自动重启。适合长期运行的服务。

**场景示例：**

你有一个 Jupyter Server 启动脚本位于 `/home/ubuntu/projects/services/start_jupyterserver.sh`，希望确保它持续运行。

**步骤：**

1. 点击 **"新建任务"**
2. 选择 **"守护进程任务"** 类型
3. 填写基本信息：
   - **任务名称**：`Jupyter Server 守护`
   - **描述**：`监控并自动重启 Jupyter Server`
   - **Cron 表达式**：`* * * * *`（每分钟检查）
4. 配置守护进程设置：
   - **目标脚本**：`/home/ubuntu/projects/services/start_jupyterserver.sh`
   - **进程名称**：`jupyter`（用于通过 pgrep 识别进程）
   - **自动重启**：✓ 启用
   - **重启延迟**：5 秒
   - **最大重启次数**：3

**守护进程工作原理：**

1. Cron 每分钟执行包装脚本
2. 脚本检查目标进程是否运行（通过 PID 文件 + 进程名）
3. 如果正常运行，退出等待下次检查
4. 如果进程不存在，执行启动脚本
5. 记录新 PID 到文件
6. 如果启用自动重启，失败时重试最多指定次数

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

**常用示例：**

| 表达式 | 说明 |
|--------|------|
| `* * * * *` | 每分钟 |
| `*/5 * * * *` | 每5分钟 |
| `0 * * * *` | 每小时整点 |
| `0 9 * * *` | 每天 9:00 |
| `0 0 * * *` | 每天 0:00（午夜） |
| `0 0 * * 1` | 每周一 0:00 |
| `0 9 1 * *` | 每月1日 9:00 |

### 管理任务

**任务状态：**

- **已启用** - 任务在 crontab 中激活（未注释）
- **已禁用** - 任务在 crontab 中被注释
- **已暂停** - 任务被暂停，保留在 crontab 中（已注释），可恢复

**操作：**

| 按钮 | 操作 | 说明 |
|------|------|-------------|
| ▶ 执行 | 立即执行 | 手动触发执行 |
| ⏸ 暂停 | 暂停 | 暂停任务，可稍后恢复 |
| ▶ 恢复 | 恢复 | 恢复已暂停的任务 |
| ⚡ 切换 | 启用/禁用 | 切换启用/禁用状态 |
| 📝 编辑 | 编辑 | 修改任务配置 |
| 📄 日志 | 查看日志 | 查看执行日志 |
| 🗑 删除 | 删除 | 删除任务（可选择保留文件） |

## 项目结构

```
CrontabManager/
├── backend/              # FastAPI 后端
│   ├── api/              # API 路由
│   ├── services/         # 业务逻辑
│   │   ├── crontab_manager.py    # crontab 操作
│   │   ├── task_runner.py        # 手动执行
│   │   ├── file_storage.py       # 脚本文件管理
│   │   ├── log_manager.py        # 日志文件管理
│   │   └── task_templates.py     # 脚本模板生成器
│   ├── data/             # 数据目录
│   │   └── scripts/      # 任务脚本
│   │       └── task_{id}/
│   │           ├── run.sh      # 生成的脚本
│   │           └── cron.log    # 执行日志
│   ├── main.py           # 入口文件
│   ├── models.py         # Pydantic 模型
│   ├── config.py         # 配置
│   └── requirements.txt
├── frontend/             # Next.js 前端
│   ├── app/              # 页面路由
│   ├── components/       # 组件
│   ├── lib/
│   │   └── api.ts        # API 客户端
│   ├── next.config.js    # Next.js 配置
│   └── .env.example      # 前端环境变量示例
├── .github/
│   └── workflows/
│       └── release.yml   # 自动发布工作流
├── .env.example          # 后端环境变量示例
├── deploy.sh             # 部署脚本
├── start.sh              # 启动脚本
├── stop.sh               # 停止脚本
├── status.sh             # 状态检查脚本
├── VERSION               # 版本文件
└── README.md
```

## 配置

### 后端环境变量

复制 `.env.example` 到 `.env` 并配置：

```bash
cp .env.example .env
```

**Python 环境配置：**

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PYTHON_ENV_TYPE` | `venv` | Python 环境类型：`venv` 或 `conda` |
| `VENV_ACTIVATE` | `venv/bin/activate` | venv 激活脚本路径 |
| `CONDA_ACTIVATE` | - | conda 激活脚本路径（如 `/home/ubuntu/miniconda3/bin/activate`） |
| `CONDA_ENV` | - | conda 环境名称（如 `py39-sm`） |

**服务配置：**

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `BACKEND_HOST` | `0.0.0.0` | 后端绑定地址 (`0.0.0.0` 所有接口, `127.0.0.1` 仅本地) |
| `BACKEND_PORT` | `8000` | 后端 API 端口 |
| `DATA_DIR` | `./data` | 脚本和日志的数据目录 |
| `SCRIPTS_DIR` | `./data/scripts` | 脚本存储目录 |
| `CRONTAB_USER` | (空) | crontab 用户 (空=当前用户, `root`=系统 crontab) |
| `CRON_TASK_PREFIX` | `# script-monitor-task:` | crontab 中识别任务的前缀 |

**示例 `.env` - 使用 Conda：**

```env
# Python 环境配置
PYTHON_ENV_TYPE=conda
CONDA_ACTIVATE=/home/ubuntu/miniconda3/bin/activate
CONDA_ENV=py39-sm

# 后端配置
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# 数据目录
DATA_DIR=./data
SCRIPTS_DIR=./data/scripts

# crontab 配置
CRONTAB_USER=
CRON_TASK_PREFIX=# script-monitor-task:
```

**示例 `.env` - 使用 Venv：**

```env
# Python 环境配置
PYTHON_ENV_TYPE=venv
VENV_ACTIVATE=venv/bin/activate

# 后端配置
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# 数据目录
DATA_DIR=./data
SCRIPTS_DIR=./data/scripts
```

### 前端环境变量

复制 `frontend/.env.example` 到 `frontend/.env.local`：

```bash
cp frontend/.env.example frontend/.env.local
```

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | 后端 API 地址 |
| `PORT` | `3000` | 前端开发服务器端口 |

**使用不同后端地址：**

```env
# 如果后端在另一台机器
NEXT_PUBLIC_API_URL=http://192.168.1.100:8000

# 或不同端口
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 修改端口

要运行在不同端口，编辑两个 `.env` 文件：

**`.env`（后端）：**
```env
BACKEND_PORT=8080
```

**`frontend/.env.local`：**
```env
PORT=8081
NEXT_PUBLIC_API_URL=http://localhost:8080
```

然后重启服务：
```bash
./stop.sh
./start.sh
```

## 测试流程

部署完成后，按以下步骤验证安装：

```bash
# 1. 检查环境
cat .env | grep PYTHON_ENV_TYPE
# 输出：PYTHON_ENV_TYPE=conda 或 PYTHON_ENV_TYPE=venv

# 2. 测试后端启动
cd backend
# 如果是 conda：
source /home/ubuntu/miniconda3/bin/activate && conda activate py39-sm
# 如果是 venv：
source venv/bin/activate
# 启动测试
python -c "from main import app; print('Backend OK')"

# 3. 完整启动测试
./start_dev.sh
# 检查输出：
# - Backend: http://0.0.0.0:8000
# - Frontend: http://localhost:3000

# 4. 访问测试
curl http://localhost:8000/
# 输出：{"name":"Crontab Manager",...}

# 5. Web 界面测试
# 浏览器访问 http://localhost:3000
# 创建测试任务 → 查看 crontab -l → 验证任务已添加
```

## 开发

### 可用脚本

部署后，项目根目录提供以下脚本：

| 脚本 | 环境 | 说明 |
|------|------|------|
| `./start_dev.sh` | 开发 | 前后端热重载模式，实时显示日志 |
| `./start_prod.sh` | 生产 | 多进程优化，后台运行，适合生产部署 |
| `./start.sh` | 简单 | 基础前台模式，适合快速测试 |
| `./stop.sh` | - | 停止所有服务 |
| `./status.sh` | - | 检查服务运行状态 |
| `./deploy.sh` | - | 部署/安装依赖 |

所有脚本从 `.env` 文件读取端口配置。

#### 开发环境 (start_dev.sh)

适用于开发调试，支持代码热重载：

```bash
./start_dev.sh
```

特性：
- **后端热重载**：Python 代码修改后自动重启
- **前端热重载**：React 组件修改后自动刷新浏览器
- **实时日志**：日志直接输出到终端
- **Ctrl+C 停止**：一键停止所有服务

#### 生产环境 (start_prod.sh)

适用于生产部署，高性能运行：

```bash
# 首次启动
./start_prod.sh

# 重启（先停止现有服务）
./start_prod.sh --restart
```

特性：
- **多进程后端**：使用多个 worker 进程处理请求（默认 4 个）
- **前端构建**：自动执行 `npm run build` 生成优化版本
- **后台运行**：服务在后台运行，不占用终端
- **日志文件**：日志写入 `logs/` 目录
- **端口检查**：自动检测端口占用并提示

生产环境环境变量：
```bash
# .env
BACKEND_WORKERS=4  # 根据 CPU 核心数调整
```

### Makefile 命令

```bash
make dev      # 启动开发服务器
make build    # 构建生产版本
make test     # 运行测试
make format   # 格式化代码
make clean    # 清理缓存
```

### 发布工作流

1. 更新 `VERSION` 文件：
   ```bash
   echo "0.2.0" > VERSION
   ```

2. 提交并推送到 master：
   ```bash
   git add VERSION
   git commit -m "chore: bump version to 0.2.0"
   git push origin master
   ```

3. 合并到 release 分支（触发自动发布）：
   ```bash
   git checkout release
   git merge master
   git push origin release
   ```

GitHub Actions 将自动：
- 从 `VERSION` 文件读取版本
- 创建 git 标签（如 `v0.2.0`）
- 创建 GitHub Release

## 工作原理

### 数据存储

与传统使用数据库的任务管理器不同，Crontab Manager 使用**系统 crontab 作为单一数据源**。

任务数据以 JSON 格式存储在 crontab 注释中：

```crontab
# script-monitor:{"id":1,"name":"每日备份","status":"enabled",...}
0 2 * * * /opt/crontab-manager/backend/data/scripts/task_1/run.sh >> /opt/crontab-manager/backend/data/scripts/task_1/cron.log 2>&1
```

**优势：**
- 无需数据库
- 任务在管理器重启/崩溃后仍然保留
- 原生 crontab 可靠性
- 易于检查和调试

### 脚本执行

1. **单次任务**：直接执行脚本，完成后退出
2. **守护进程任务**：包装脚本检查进程状态，需要时启动

### 日志管理

- 执行输出重定向到 `cron.log`
- 通过 Web UI 查看日志
- 可选：自定义日志路径
- 清空日志不影响任务

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md)

## 贡献

欢迎提交 Issue 和 Pull Request！

查看 [CONTRIBUTING.md](CONTRIBUTING.md)

## 许可证

[MIT](LICENSE)
