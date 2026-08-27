# AGENTS.md

## 项目定位（别猜）

- 这是单包 Vicinae 扩展（不是 monorepo），唯一 Vicinae 命令是 `dbox`，入口在 `src/dbox.tsx`。
- `src/sub-commands/*` 不是独立 Vicinae command；它们由 `src/dbox.tsx` 的 `baseMenuItems` 手动注册，新增子功能时必须把配置加进去。

## 环境与依赖约束

- 使用 `pnpm`（`preinstall` 强制 `only-allow pnpm`），不要用 npm/yarn。
- Node 版本按 `.nvmrc` 使用 `v22`。
- `.npmrc` 指向 `https://registry.npmmirror.com`，安装依赖慢/失败时先检查镜像可用性。
- 面向 Vicinae 支持的 Linux 与 macOS 平台；不要引入 Raycast 运行时或兼容层。

## 常用命令（已在 scripts 定义）

- 开发：`pnpm dev`（`vici develop`）
- 构建并安装到本地 Vicinae：`pnpm build`
- 构建分发产物：`pnpm build:dist`（输出到 `dist`）
- Lint：`pnpm lint`（`vici lint`）
- 仓库未提供测试脚本；若需类型检查可用 `pnpm typecheck`。

## 配置与生成文件要点

- Vicinae 偏好项定义在 `package.json > preferences`，运行时通过 `getPreferenceValues()` 读取（见 `src/cmn/injected.ts`）。
- `vicinae-env.d.ts` 是从 manifest 自动生成，**不要手改**；要改类型请改 `package.json` 后重新生成。

## 代码约定（本仓库特有）

- 列表搜索统一走 `useFuse`（`src/cmn/hooks/use-fuse.ts`）；本地缓存有两套：`useLocalStorage` 与自定义 `ExpiredStorage/useStorage`（带过期时间）。
- `dbox` 主搜索支持“命令筛选 + 参数”模式：用**双空格**分隔（例如 `google  raycast`），参数传给 quick-open-url（`parseSearchText` in `src/dbox.tsx`）。
