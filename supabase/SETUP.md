# 时衡 v2 Supabase 单用户云备份

## 1. 数据表

执行 `migrations/20260814150613_mobile_backups.sql`。迁移会：

- 创建 `public.mobile_backups`，每个 `auth.users` 用户最多一份版本化 JSON；
- 启用并强制 RLS，仅允许认证用户读、插入、更新自己的备份；
- 撤销 `anon` 的全部表权限，并显式授予 `authenticated` 必需权限；
- 通过修订号与 payload 约束阻止格式错误和静默覆盖。

不要删除 v1 的 `public.entities`；v2 不会读取它。

## 2. 唯一个人账号

在 Authentication → Users 中保留或创建个人邮箱账号，并设置邮箱密码。应用使用 `signInWithPassword`，不提供注册入口；在 Authentication 设置中关闭公开注册。

建议在 Auth 密码安全设置中开启泄露密码保护。该设置由 Supabase 控制台管理，不需要前端密钥。

## 3. 应用环境变量

本地 `.env.local` 与 GitHub Actions Variables 均配置：

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_YOUR_KEY
```

现代 publishable key 可以公开；绝不能使用 `service_role`。修改变量后需要重新构建应用。

## 4. 云备份规则

- 本地 IndexedDB 始终是界面数据源；未登录或离线不影响计时与记录。
- 登录、数据变更后 5 秒、网络恢复、回到前台和手动操作会触发备份。
- 新手机本地为空且云端有数据时，必须由用户确认恢复。
- 本地和云端修订分叉时停止覆盖，用户可先导出本地 JSON，再选择恢复云端或替换云端。
- 退出账号不删除本地账本。

## 5. 验证

用同一账号在两台手机测试：A 备份后，B 首次登录应出现恢复提示；让 A、B 在同一云修订上分别产生本地改动，后同步的设备必须进入冲突选择界面。使用匿名浏览器请求 `mobile_backups` 应被权限或 RLS 拒绝。
