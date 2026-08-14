# Supabase 单用户配置

## 1. 建库

在 Supabase Dashboard 新建项目后，打开 SQL Editor，完整执行 `migrations/001_initial.sql`。执行后检查：

- `public.entities` 已启用并强制 RLS；
- `anon` 没有表权限，`authenticated` 只有读取、插入和更新权限；
- Realtime publication 包含 `public.entities`。

## 2. 创建唯一账号

在 Authentication → Users 中邀请或创建你的个人邮箱账号。确认账号存在后，在 Authentication → Settings 中关闭新用户注册。

应用调用 `signInWithOtp(... shouldCreateUser: false)`，陌生邮箱无法自行注册。

## 3. 改成 6 位验证码邮件

在 Authentication → Email Templates → Magic Link 中，将正文中的确认链接替换为验证码变量：

```html
<h2>时衡登录验证码</h2>
<p>你的验证码是：<strong>{{ .Token }}</strong></p>
<p>验证码短时间内有效。如果不是你本人操作，请忽略本邮件。</p>
```

## 4. 配置 URL

在 Authentication → URL Configuration 中设置：

- Site URL：`https://weiweisama402.github.io/codex-time/`
- Redirect URLs：加入上述正式地址及 `http://localhost:5173/**`

## 5. 配置应用

本地创建 `.env.local`：

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

正式部署把相同值加入 GitHub Actions Variables。匿名公钥设计为公开使用；绝不能把 `service_role` 密钥交给浏览器。

## 6. 双设备验收

1. 在两个独立浏览器配置文件中用同一邮箱登录。
2. A 创建项目与计时记录，B 聚焦后应自动出现。
3. A 离线编辑一条记录，B 在线编辑同一条记录；A 恢复联网后应出现冲突，且不能静默丢失任一版本。
4. A 删除记录，B 同步后应在回收站看到软删除结果。
