import * as fs from 'fs/promises';
import * as path from 'path';
import { uniq, uniqBy } from 'es-toolkit';
import { settings } from './injected';

export interface ILocalProject {
  name: string;
  path: string;
  /** VSCode 的多根工作区文件（`.code-workspace`）。 */
  isWorkspace: boolean;
}

const WorkspaceSuffix = '.code-workspace';

/** 扫描偏好项 `codeDir` 下的目录与 `.code-workspace` 文件。 */
export const loadCodeProjects = async (): Promise<ILocalProject[]> => {
  const roots = uniq(
    (settings.codeDir || '')
      .split(',')
      .map(it => it.trim())
      .filter(Boolean),
  );
  const projects: ILocalProject[] = [];

  for (const root of roots) {
    const items = (await fs.readdir(root, { withFileTypes: true }).catch(() => null)) || [];
    const names = items
      .filter(item => item.isDirectory() || item.name.endsWith(WorkspaceSuffix))
      .map(item => item.name);

    projects.push(
      ...names.map(name => ({
        name: name.replace(WorkspaceSuffix, ''),
        isWorkspace: name.endsWith(WorkspaceSuffix),
        path: path.resolve(root, name),
      })),
    );
  }

  return uniqBy(projects, it => it.path).toSorted((a, b) => {
    if (a.isWorkspace === b.isWorkspace) {
      return a.name.localeCompare(b.name);
    }

    return a.isWorkspace ? -1 : 1;
  });
};

export interface WorkspaceFolder {
  path?: string;
}

export interface WorkspaceFile {
  folders?: WorkspaceFolder[];
}

/** 读出 VSCode 工作区文件声明的所有根目录。 */
export const getWorkspaceFolders = async (workspacePath: string) => {
  const workspace = JSON.parse(await fs.readFile(workspacePath, 'utf8')) as WorkspaceFile;
  const workspaceDir = path.dirname(workspacePath);

  return (workspace.folders || [])
    .map(folder => folder.path)
    .filter((folderPath): folderPath is string => Boolean(folderPath))
    .map(folderPath => (path.isAbsolute(folderPath) ? folderPath : path.resolve(workspaceDir, folderPath)));
};