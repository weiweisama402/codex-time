# 时衡 v1.0

“时衡”是一款基于柳比歇夫时间管理法的个人时间记录 PWA。它把时间视为可验证的数据，形成“记录—统计—复盘—计划”的长期闭环。

## 核心能力

- 实时计时、暂停/继续、刷新恢复，以及按净时长或起止时间手动补录；
- 四大固定统计语义（主要工作、附加工作、休闲、娱乐）与可配置项目、任务、标签、快捷预设；
- 日/周时间轴，日/周/月/年/自定义洞察，项目投入排行和记录热力图；
- 周/月/年投入计划、计划/实际进度，以及日/周/月/年结构化复盘；
- IndexedDB 本地优先、离线使用、Supabase 邮箱验证码与跨设备增量同步；
- 版本化 JSON 备份、CSV 导出、打印/另存 PDF、30 天回收站；
- 可安装 PWA、显式更新提示、浅色/深色主题和响应式手机/电脑界面。

v1.0 使用全新的 `shiheng-v1` IndexedDB，不读取或删除 v0.1 数据。

## 本地开发

需要 Node.js 24+ 与 npm 11+。

```powershell
npm.cmd install
npm.cmd run dev
```

未配置 Supabase 时，应用自动进入完整的本地演示模式，用户 ID 固定为本地测试账号。

常用检查：

```powershell
npm.cmd run check
npm.cmd run test:e2e
npm.cmd run audit:lighthouse
```

## Supabase 同步

1. 新建独立 Supabase 项目。
2. 在 SQL Editor 执行 [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql)。
3. 按 [`supabase/SETUP.md`](supabase/SETUP.md) 创建唯一用户、配置 6 位邮箱验证码并关闭公开注册。
4. 复制 `.env.example` 为 `.env.local`，填写项目 URL 与匿名公钥。
5. 重新启动开发服务器并完成双浏览器同步验证。

匿名公钥会被打包到浏览器，安全边界是数据库 RLS；不要在前端配置 `service_role` 密钥。

## GitHub Pages

工作流 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) 仅在 `main` 更新时发布。正式发布前，在 GitHub 仓库的 Settings → Secrets and variables → Actions → Variables 中添加：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

并在 Pages 设置中选择 GitHub Actions 作为发布源。工作流会在变量缺失时主动失败，避免把不具备跨设备同步的构建误发布为正式版。

## 数据和同步规则

- 所有操作先写入本地 IndexedDB，再加入 outbox；联网、登录、窗口聚焦和 Realtime 事件会触发同步。
- 云端写入使用版本号条件，发生同时编辑时进入冲突中心，不会静默覆盖。
- 删除是 30 天软删除；JSON 导入先进行 v1.0 schema 校验，并在单个本地事务中替换。
- 时间戳存 UTC，日统计另存用户时区下的 `dateKey`；默认时区为 `Asia/Shanghai`，每周从周一开始。

## 验收

自动化覆盖领域统计、备份校验、组件与 Chrome/Edge 手机/桌面流程。最新本地质量报告见 [`docs/QUALITY.md`](docs/QUALITY.md)，真实 Android Chrome 的最终安装与网络切换检查见 [`docs/ANDROID_QA.md`](docs/ANDROID_QA.md)。

## 技术栈

Vite、React、TypeScript、Zustand、Dexie、Supabase JS、Recharts、vite-plugin-pwa、Vitest、Testing Library、Playwright、axe-core。
