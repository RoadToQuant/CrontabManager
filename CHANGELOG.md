# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 初始版本发布

## [2.0.0] - 2026-03-11

### Changed
- **架构重构**: 从内置调度器改为系统 crontab 调度
- **脚本统一**: 所有任务统一转换为 bash 脚本执行
- **数据模型简化**: 脚本内容存储在文件系统，数据库仅保存元数据

### Features
- 📝 可视化 crontab 管理界面
- 🐚 纯 Bash 脚本执行
- ⏰ 系统级定时调度（管理器停止不影响任务执行）
- 📊 执行日志查看
- 🔄 任务启停控制
- 🔧 环境变量和工作目录设置

### Technical
- 后端：FastAPI + SQLAlchemy + SQLite
- 前端：Next.js 14 + TypeScript + Tailwind CSS
- 部署：Ubuntu 22.04 + crontab

---

## [1.0.0] - 早期版本 (已归档)

### Features
- APScheduler 内置调度
- 支持 Python / Shell / PowerShell 多类型脚本
- 实时 WebSocket 日志推送
- 执行器管理
