# 浏览器标签页品牌图标设计

## 目标

将用户提供的“帮帮问法”Logo用于浏览器标签页左侧的 favicon；页面导航栏中的 Logo 和布局保持不变。

## 方案

使用现有 Next.js App Router 的文件式 metadata 图标机制：以用户提供的 PNG 生成兼容浏览器的 ICO，并将其放置在 `src/app/favicon.ico`。不修改业务组件、不增加依赖、不改变导航栏图片引用。

## 验收标准

- `src/app/favicon.ico` 为用户提供 Logo 的图标资源。
- 本地构建通过，Next.js 能正常生成 favicon 路由。
- 浏览器访问 `/favicon.ico` 返回成功且为图标资源。
- 仅 favicon 变化，页面导航栏和业务逻辑无变更。
