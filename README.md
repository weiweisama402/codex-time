# 时衡 v2.0

“时衡”是一个只面向 Android 手机的柳比歇夫时间记录 PWA，聚焦“计时—记录—统计”闭环。打开即可离线使用，Supabase 登录仅用于可选的个人云备份。

## 核心能力

- 实时计时、暂停/继续、刷新与后台恢复，同一时间只保留一个活动计时器；
- 跨用户时区午夜自动拆分记录，补录只需日期、活动、四类语义、分钟和备注；
- 主要工作、附加工作、休闲、娱乐四类时间统计，以及今日/本周趋势；
- 记录可编辑、再次计时、复制、软删除并在 10 秒内撤销；
- 全新的 `shiheng-v2` IndexedDB，不读取、迁移或删除 v1 数据；
- 版本化 JSON 备份、CSV 导出、单事务导入、30 天软删除清理；
- 可选邮箱密码登录、单用户 Supabase 云备份和显式修订冲突处理；
- 竖屏 PWA、离线应用壳、显式更新提示、深色模式、安全区与 Android 返回键适配；
- 电脑访问时只显示手机专用说明与访问二维码。

## 本地开发

需要 Node.js 24+ 与 npm。

```powershell
npm.cmd install
npm.cmd run dev
```

未配置 Supabase 时仍可完整使用本地功能。常用质量命令：

```powershell
npm.cmd run check
npm.cmd run test:e2e
npm.cmd run audit:lighthouse
```

## Supabase 云备份

v2 只使用 `public.mobile_backups`；v1 的 `public.entities` 保留但不会读取。

1. 执行 [`supabase/migrations/20260814150613_mobile_backups.sql`](supabase/migrations/20260814150613_mobile_backups.sql)。
2. 按 [`supabase/SETUP.md`](supabase/SETUP.md) 保留唯一个人账号、关闭公开注册并设置密码。
3. 复制 `.env.example` 为 `.env.local`，填写项目 URL 与 publishable key。

publishable key 会进入浏览器构建，安全边界由数据库 RLS 提供；不要把 `service_role` 密钥放进前端。

## GitHub Pages

工作流 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) 会检查格式、ESLint、单元/组件测试、生产构建和 Android 浏览器流程。仓库 Actions Variables 需要：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`（可填写现代 `sb_publishable_...` key）

`codex/v2.0` 用于候选部署；验收后合并到 `main` 并创建 `v2.0` 标签。

## 验收资料

- 自动化和数据库验证结果：[`docs/QUALITY.md`](docs/QUALITY.md)
- 真实 Android Chrome/Edge 清单：[`docs/ANDROID_QA.md`](docs/ANDROID_QA.md)

## 技术栈

Vite、React、TypeScript、Zustand、Dexie、Supabase JS、vite-plugin-pwa、Vitest、Testing Library、Playwright 与 axe-core。
