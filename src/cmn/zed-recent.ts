import { DatabaseSync } from 'node:sqlite';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Zed 把最近项目存在本地 SQLite 里（`<user-data-dir>/db/0-<channel>/db.sqlite` 的 `workspaces` 表），
 * CLI 没有导出历史的接口，只能读库。
 *
 * 参考：
 * - https://zed.dev/docs/troubleshooting#startup-and-workspace-issues
 * - crates/workspace/src/persistence.rs `recent_workspaces_query` / `recent_project_workspaces_ungrouped`
 * - crates/util/src/path_list.rs `PathList::deserialize`
 */

/** Zed 的发布渠道决定库目录名，按使用频率排序。 */
const ZED_CHANNELS = ['0-stable', '0-preview', '0-nightly', '0-dev'];

/** 与 Zed 一致：路径全部存在、且至少一个是目录，才算一个可打开的本地项目。 */
const isLiveProject = (paths: string[]) =>
  paths.length > 0 &&
  paths.every(target => fs.existsSync(target)) &&
  paths.some(target => {
    try {
      return fs.statSync(target).isDirectory();
    } catch {
      return false;
    }
  });

const getZedDataDir = () => {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    return localAppData ? path.join(localAppData, 'Zed') : null;
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Zed');
  }

  return path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'zed');
};

export interface IZedRecentProject {
  name: string;
  path: string;
  /** Zed 里一个 workspace 可以有多个根目录，除 path 外的其余根。 */
  extraPaths: string[];
}

interface IZedWorkspaceRow {
  paths: string;
  paths_order: string;
}

/** 读取 Zed 自身的最近项目列表；任何一步失败都返回空列表，不影响原有功能。 */
export const loadZedRecentProjects = (): IZedRecentProject[] => {
  const dataDir = getZedDataDir();
  if (!dataDir) return [];

  const dbRoot = path.join(dataDir, 'db');
  const dbDir = ZED_CHANNELS.map(channel => path.join(dbRoot, channel)).find(dir => fs.existsSync(dir));
  if (!dbDir) return [];

  let rows: IZedWorkspaceRow[];
  try {
    const db = new DatabaseSync(path.join(dbDir, 'db.sqlite'), { readOnly: true });
    rows = db
      .prepare(
        `SELECT paths, paths_order FROM workspaces
         WHERE paths IS NOT NULL AND remote_connection_id IS NULL
         ORDER BY timestamp DESC`,
      )
      .all() as unknown as IZedWorkspaceRow[];
    db.close();
  } catch {
    return [];
  }

  const workspaces: string[][] = rows.map(row => {
    // 与 PathList::deserialize 一致：paths 已按字典序存储，order 记录原始顺序。
    const sortedPaths = (row.paths || '').split('\n').filter(Boolean);
    const order = (row.paths_order || '')
      .split(',')
      .map(Number)
      .filter((value): value is number => Number.isInteger(value));

    if (order.length !== sortedPaths.length) {
      return sortedPaths.toSorted();
    }

    return sortedPaths
      .map((target, index) => ({ order: order[index], target }))
      .toSorted((a, b) => a.order - b.order)
      .map(entry => entry.target);
  });

  const seenWorkspace = new Set<string>();
  const projects: IZedRecentProject[] = [];

  for (const paths of workspaces) {
    if (!isLiveProject(paths)) continue;

    // Zed 按 workspace 的根目录集合去重，保留时间戳最新的那条。
    const key = paths.toSorted().join('\n');
    if (seenWorkspace.has(key)) continue;
    seenWorkspace.add(key);

    projects.push({
      name: paths.map(target => path.basename(target)).join(', '),
      path: paths[0],
      extraPaths: paths.slice(1),
    });
  }

  return projects;
};