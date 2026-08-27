# DBox for Vicinae

一个以 Vicinae 为唯一运行时的 DBox 工具箱扩展。使用 `@vicinae/api` 和 `vici` 开发、构建：

- `pnpm dev`：连接正在运行的 Vicinae 进行开发
- `pnpm build`：构建并安装到本地 Vicinae 扩展目录
- `pnpm build:dist`：生成可分发的扩展到 `dist`
- `pnpm lint`：执行 Vicinae 扩展 lint

在 Vicinae 的扩展偏好设置中配置 `codeDir`。`codeDir` 支持以逗号分隔多个根目录。
