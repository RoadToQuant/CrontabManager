# Crontab Manager

**English** | [中文](./README.zh.md)

A web-based crontab management tool. All tasks are converted to bash scripts and added to system crontab. Tasks continue to execute as scheduled even if the manager is stopped.

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.1-blue.svg)](./VERSION)

## Features

- 📝 **Visual Crontab Management** - Manage scheduled tasks via Web UI
- 🐚 **Pure Bash Execution** - All tasks are converted to bash scripts
- 🔄 **Two Task Types** - Simple (one-time execution) and Daemon (auto-restart)
- ⏸️ **Task Suspension** - Pause tasks without removing from crontab
- ⏰ **System-level Scheduling** - Uses system crontab, works even when manager stops
- 📊 **Execution Logs** - View task execution history and output
- 🗑️ **Selective Deletion** - Choose to keep or delete scripts and logs
- 🔄 **Real-time Sync** - Task changes automatically sync to crontab

## Tech Stack

- **Backend**: Python + FastAPI + Pydantic
- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Scheduler**: System crontab
- **Storage**: Crontab as single source of truth (no database)

## Quick Start

### Requirements

- Ubuntu 22.04 (recommended)
- Python 3.9+
- Node.js 18+
- cron

### One-Click Deploy

#### Option 1: Use Existing Python Environment (Recommended)

If you already have a configured conda or venv environment:

```bash
# Clone repository
git clone https://github.com/RoadToQuant/CrontabManager.git
cd CrontabManager

# Configure environment (specify your Python environment)
cp .env.example .env

# Edit .env and set your environment:
# Option A: Using conda
# PYTHON_ENV_TYPE=conda
# CONDA_ACTIVATE=/home/ubuntu/miniconda3/bin/activate
# CONDA_ENV=py39-sm
#
# Option B: Using venv
# PYTHON_ENV_TYPE=venv
# VENV_ACTIVATE=venv/bin/activate

# Deploy (auto-detects environment, skips creation)
./deploy.sh

# Start services
./start_dev.sh
```

#### Option 2: Auto-Create New Environment

If you don't have a Python environment, deploy.sh will create one:

```bash
# Clone repository
git clone https://github.com/RoadToQuant/CrontabManager.git
cd CrontabManager

# Deploy (auto-creates venv)
./deploy.sh

# Start services
./start_dev.sh
```

#### Deploy Options

```bash
./deploy.sh              # Auto-detect: use existing or create new
./deploy.sh --fresh      # Force create new virtual environment
./deploy.sh --conda      # Use conda environment (configure .env first)
./deploy.sh --venv       # Use venv (default)
```

Visit http://localhost:3000 (or your configured FRONTEND_PORT)

### Manual Install

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Usage Guide

### Creating Tasks

#### Task Type 1: Simple Task (One-time Execution)

For tasks that run once per scheduled cycle and then exit. Ideal for periodic jobs like backups, data sync, reports.

**Steps:**

1. Click **"New Task"**
2. Select **"Simple Task"** type
3. Fill in basic info:
   - **Name**: `Daily Backup`
   - **Description**: `Backup data at 2 AM daily`
   - **Cron Expression**: `0 2 * * *` (daily at 2 AM)
4. Write bash script:

```bash
#!/bin/bash

echo "========================================"
echo "Backup started at $(date)"
echo "========================================"

# Backup data
tar -czf /backup/data_$(date +%Y%m%d).tar.gz /home/ubuntu/data/

echo "Backup completed at $(date)"
echo "========================================"
```

5. (Optional) Set working directory and environment variables
6. Check **"Enable immediately"**
7. Click **"Create Task"**

#### Task Type 2: Daemon Task (Auto-restart)

For wrapping existing scripts as daemon processes. Monitors the process and auto-restarts if it crashes. Ideal for long-running services.

**Scenario Example:**

You have a Jupyter Server startup script at `/home/ubuntu/projects/services/start_jupyterserver.sh` and want to ensure it keeps running.

**Steps:**

1. Click **"New Task"**
2. Select **"Daemon Task"** type
3. Fill in basic info:
   - **Name**: `Jupyter Server Daemon`
   - **Description**: `Monitor and auto-restart Jupyter Server`
   - **Cron Expression**: `* * * * *` (check every minute)
4. Configure daemon settings:
   - **Target Script**: `/home/ubuntu/projects/services/start_jupyterserver.sh`
   - **Process Name**: `jupyter` (used to identify process via pgrep)
   - **Auto-restart**: ✓ Enabled
   - **Restart Delay**: 5 seconds
   - **Max Restarts**: 3

**How Daemon Works:**

1. Cron executes the wrapper script every minute
2. Script checks if target process is running (via PID file + process name)
3. If running normally, exits and waits for next check
4. If process not found, executes the startup script
5. Records new PID to file
6. If auto-restart enabled, retries on failure up to max restarts

### Cron Expression Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └── Weekday (0-6, 0=Sunday)
│ │ │ └──── Month (1-12)
│ │ └────── Day (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

**Common Examples:**

| Expression | Description |
|------------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour at :00 |
| `0 9 * * *` | Daily at 9:00 |
| `0 0 * * *` | Daily at 0:00 (midnight) |
| `0 0 * * 1` | Weekly on Monday 0:00 |
| `0 9 1 * *` | Monthly on 1st at 9:00 |

### Managing Tasks

**Task Status:**

- **Enabled** - Task is active in crontab (uncommented)
- **Disabled** - Task is commented out in crontab
- **Suspended** - Task is paused, kept in crontab (commented), can be resumed

**Operations:**

| Button | Action | Description |
|--------|--------|-------------|
| ▶ Run | Execute now | Manually trigger execution |
| ⏸ Pause | Suspend | Pause task, can resume later |
| ▶ Resume | Resume | Resume suspended task |
| ⚡ Toggle | Enable/Disable | Toggle enabled/disabled state |
| 📝 Edit | Edit | Modify task configuration |
| 📄 Logs | View logs | View execution logs |
| 🗑 Delete | Delete | Remove task with options |

## Project Structure

```
CrontabManager/
├── backend/              # FastAPI backend
│   ├── api/              # API routes
│   ├── services/         # Business logic
│   │   ├── crontab_manager.py    # Crontab operations
│   │   ├── task_runner.py        # Manual execution
│   │   ├── file_storage.py       # Script file management
│   │   ├── log_manager.py        # Log file management
│   │   └── task_templates.py     # Script template generators
│   ├── data/             # Data directory
│   │   └── scripts/      # Task scripts
│   │       └── task_{id}/
│   │           ├── run.sh      # Generated script
│   │           └── cron.log    # Execution log
│   ├── main.py           # Entry point
│   ├── models.py         # Pydantic models
│   ├── config.py         # Configuration
│   └── requirements.txt
├── frontend/             # Next.js frontend
│   ├── app/              # Page routes
│   ├── components/       # Components
│   ├── lib/
│   │   └── api.ts        # API client
│   ├── next.config.js    # Next.js configuration
│   └── .env.example      # Frontend env example
├── .github/
│   └── workflows/
│       └── release.yml   # Auto-release workflow
├── .env.example          # Backend env example
├── deploy.sh             # Deploy script
├── start.sh              # Start script
├── stop.sh               # Stop script
├── status.sh             # Status check script
├── VERSION               # Version file
└── README.md
```

## Configuration

### Backend Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Python Environment Configuration:**

| Variable | Default | Description |
|----------|---------|-------------|
| `PYTHON_ENV_TYPE` | `venv` | Python environment type: `venv` or `conda` |
| `VENV_ACTIVATE` | `venv/bin/activate` | Path to venv activate script |
| `CONDA_ACTIVATE` | - | Path to conda activate (e.g., `/home/ubuntu/miniconda3/bin/activate`) |
| `CONDA_ENV` | - | Conda environment name (e.g., `py39-sm`) |

**Service Configuration:**

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_HOST` | `0.0.0.0` | Backend bind address (`0.0.0.0` for all, `127.0.0.1` for localhost only) |
| `BACKEND_PORT` | `8000` | Backend API port |
| `DATA_DIR` | `./data` | Data directory for scripts and logs |
| `SCRIPTS_DIR` | `./data/scripts` | Scripts storage directory |
| `CRONTAB_USER` | (empty) | Crontab user (empty = current user, `root` = system crontab) |
| `CRON_TASK_PREFIX` | `# script-monitor-task:` | Prefix for identifying tasks in crontab |

**Example `.env` - Using Conda:**

```env
# Python Environment Configuration
PYTHON_ENV_TYPE=conda
CONDA_ACTIVATE=/home/ubuntu/miniconda3/bin/activate
CONDA_ENV=py39-sm

# Backend Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Data directories
DATA_DIR=./data
SCRIPTS_DIR=./data/scripts

# Crontab Configuration
CRONTAB_USER=
CRON_TASK_PREFIX=# script-monitor-task:
```

**Example `.env` - Using Venv:**

```env
# Python Environment Configuration
PYTHON_ENV_TYPE=venv
VENV_ACTIVATE=venv/bin/activate

# Backend Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Data directories
DATA_DIR=./data
SCRIPTS_DIR=./data/scripts
```

### Frontend Environment Variables

Copy `frontend/.env.example` to `frontend/.env.local`:

```bash
cp frontend/.env.example frontend/.env.local
```

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL |
| `PORT` | `3000` | Frontend development server port |

**To use a different backend address:**

```env
# If backend is on another machine
NEXT_PUBLIC_API_URL=http://192.168.1.100:8000

# Or different port
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Changing Ports

To run on custom ports, edit both `.env` files:

**`.env` (backend):**
```env
BACKEND_PORT=8080
```

**`frontend/.env.local`:**
```env
PORT=8081
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Then restart services:
```bash
./stop.sh
./start.sh
```

## Testing

After deployment, verify installation with these steps:

```bash
# 1. Check environment
cat .env | grep PYTHON_ENV_TYPE
# Output: PYTHON_ENV_TYPE=conda or PYTHON_ENV_TYPE=venv

# 2. Test backend startup
cd backend
# For conda:
source /home/ubuntu/miniconda3/bin/activate && conda activate py39-sm
# For venv:
source venv/bin/activate
# Test startup
python -c "from main import app; print('Backend OK')"

# 3. Full startup test
./start_dev.sh
# Check output:
# - Backend: http://0.0.0.0:8000
# - Frontend: http://localhost:3000

# 4. Access test
curl http://localhost:8000/
# Output: {"name":"Crontab Manager",...}

# 5. Web UI test
# Browser: http://localhost:3000
# Create test task → Run crontab -l → Verify task added
```

## Development

### Available Scripts

After deployment, the following scripts are available in the project root:

| Script | Environment | Description |
|--------|-------------|-------------|
| `./start_dev.sh` | Development | Hot reload mode for both frontend and backend |
| `./start_prod.sh` | Production | Multi-process optimized, runs in background |
| `./start.sh` | Simple | Basic foreground mode for quick testing |
| `./stop.sh` | - | Stop all services |
| `./status.sh` | - | Check service status |
| `./deploy.sh` | - | Deploy/Install dependencies |

All scripts read port configuration from `.env` file.

#### Development (start_dev.sh)

For development and debugging with hot reload support:

```bash
./start_dev.sh
```

Features:
- **Backend hot reload**: Auto-restart when Python code changes
- **Frontend hot reload**: Auto-refresh browser when React components change
- **Real-time logs**: Logs displayed directly in terminal
- **Ctrl+C to stop**: Stop all services with one key

#### Production (start_prod.sh)

For production deployment with high performance:

```bash
# First start
./start_prod.sh

# Restart (stops existing services first)
./start_prod.sh --restart
```

Features:
- **Multi-process backend**: Multiple worker processes (default 4)
- **Frontend build**: Auto runs `npm run build` for optimized version
- **Background mode**: Services run in background, no terminal occupation
- **Log files**: Logs written to `logs/` directory
- **Port check**: Auto detects port conflicts

Production environment variable:
```bash
# .env
BACKEND_WORKERS=4  # Adjust based on CPU cores
```

### Makefile Commands

```bash
make dev      # Start development servers
make build    # Build production version
make test     # Run tests
make format   # Format code
make clean    # Clean cache
```

### Release Workflow

1. Update `VERSION` file:
   ```bash
   echo "0.2.0" > VERSION
   ```

2. Commit and push to master:
   ```bash
   git add VERSION
   git commit -m "chore: bump version to 0.2.0"
   git push origin master
   ```

3. Merge to release branch (triggers auto-release):
   ```bash
   git checkout release
   git merge master
   git push origin release
   ```

GitHub Actions will:
- Read version from `VERSION` file
- Create git tag (e.g., `v0.2.0`)
- Create GitHub Release

## How It Works

### Data Storage

Unlike traditional task managers that use databases, Crontab Manager uses the **system crontab as the single source of truth**.

Task data is stored in crontab comments as JSON:

```crontab
# script-monitor:{"id":1,"name":"Daily Backup","status":"enabled",...}
0 2 * * * /opt/crontab-manager/backend/data/scripts/task_1/run.sh >> /opt/crontab-manager/backend/data/scripts/task_1/cron.log 2>&1
```

**Benefits:**
- No database required
- Tasks survive manager restarts/crashes
- Native crontab reliability
- Easy to inspect and debug

### Script Execution

1. **Simple Tasks**: Execute script directly, exit after completion
2. **Daemon Tasks**: Wrapper script checks process status, starts if needed

### Log Management

- Execution output redirected to `cron.log`
- View logs via Web UI
- Optional: Custom log path
- Clear logs without affecting task

## Changelog

See [CHANGELOG.md](CHANGELOG.md)

## Contributing

Issues and Pull Requests are welcome!

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[MIT](LICENSE)
