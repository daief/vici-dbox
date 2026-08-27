import { Action, ActionPanel, getApplications, Icon, List, open } from '@vicinae/api';
import { useMemoizedFn, useRequest } from 'ahooks';
import * as fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { settings, uniq, uniqBy, useFuse, useRecentItems } from '../cmn';
import * as path from 'path';
import { useMemo } from 'react';

const execFileAsync = promisify(execFile);
const RecentProjectsKey = 'open-project/recent-projects';
const MaxRecentProjectCount = 5;

export interface IProjectItem {
  name: string;
  path: string;
  isWorkspace: boolean;
}

export interface OpenProjectCommandProps {
  application: string;
  actionTitle: string;
}

interface WorkspaceFolder {
  path?: string;
}

interface WorkspaceFile {
  folders?: WorkspaceFolder[];
}

const quoteNushellArgument = (value: string) => `'${value.replaceAll("'", "''")}'`;

const getWorkspaceFolders = async (workspacePath: string) => {
  const workspace = JSON.parse(await fs.readFile(workspacePath, 'utf8')) as WorkspaceFile;
  const workspaceDir = path.dirname(workspacePath);

  return (workspace.folders || [])
    .map(folder => folder.path)
    .filter((folderPath): folderPath is string => Boolean(folderPath))
    .map(folderPath => (path.isAbsolute(folderPath) ? folderPath : path.resolve(workspaceDir, folderPath)));
};

const loadProjects = async () => {
  const workspaceSuffix = '.code-workspace';
  const roots = uniq(
    (settings.codeDir || '')
      .split(',')
      .map(it => it.trim())
      .filter(Boolean),
  );
  const projects: IProjectItem[] = [];
  for (const root of roots) {
    const items = (await fs.readdir(root, { withFileTypes: true }).catch(() => null)) || [];
    const alloweds = items
      .filter(item => {
        if (item.isDirectory()) {
          return true;
        }

        if (item.name.endsWith(workspaceSuffix)) {
          return true;
        }

        return false;
      })
      .map(item => item.name);

    projects.push(
      ...alloweds.map(dir => ({
        name: dir.replace(workspaceSuffix, ''),
        isWorkspace: dir.endsWith(workspaceSuffix),
        path: path.resolve(root, dir),
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

export function OpenProjectCommand({ application, actionTitle }: OpenProjectCommandProps) {
  const isZed = application.toLowerCase().includes('zed');
  const { data: allProjects = [], loading: isLoading } = useRequest(loadProjects);
  const {
    items: recentProjects,
    addItem: addRecentProject,
    isIniting: isRecentProjectsIniting,
  } = useRecentItems<IProjectItem>(
    RecentProjectsKey,
    project => project.path,
    MaxRecentProjectCount,
  );

  const fuse = useFuse(allProjects, { keys: ['name', 'path'] });
  const availableRecentProjects = useMemo(() => {
    const projectsByPath = new Map(allProjects.map(project => [project.path, project]));
    return recentProjects.flatMap(project => {
      const currentProject = projectsByPath.get(project.path);
      return currentProject ? [currentProject] : [];
    });
  }, [allProjects, recentProjects]);
  const recentFuse = useFuse(availableRecentProjects, { keys: ['name', 'path'] });
  const projects = useMemo(() => {
    if (isRecentProjectsIniting) return fuse.results;
    const recentPaths = new Set(recentFuse.results.map(project => project.path));
    return [...recentFuse.results, ...fuse.results.filter(project => !recentPaths.has(project.path))];
  }, [fuse.results, isRecentProjectsIniting, recentFuse.results]);

  const openProject = useMemoizedFn(async (project: IProjectItem) => {
    addRecentProject(project);

    if (isZed && project.isWorkspace) {
      const folders = await getWorkspaceFolders(project.path);
      if (!folders.length) return;
      await execFileAsync('nu', ['-c', `zed ${folders.map(quoteNushellArgument).join(' ')}`]);
    } else {
      const applications = await getApplications(project.path).catch(() => []);
      const targetApplication = applications.find(
        candidate => candidate.name.toLowerCase() === application.toLowerCase(),
      );
      await open(project.path, targetApplication);
    }
  });

  const renderProjectItem = (project: IProjectItem) => (
    <List.Item
      key={project.path}
      title={`${project.isWorkspace ? '[📂] ' : ''}${project.name}`}
      subtitle={project.path}
      icon={Icon.Folder}
      accessories={recentFuse.results.some(recentProject => recentProject.path === project.path) ? [{ icon: Icon.Clock, tooltip: 'Recently opened' }] : []}
      actions={
        <ActionPanel>
          <Action title={actionTitle} onAction={() => openProject(project)} />
          <Action.ShowInFinder
            title="Show In Finder"
            path={project.path}
            shortcut={{ modifiers: ['cmd'], key: 'f' }}
          />
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search project dir..."
      searchText={fuse.query}
      onSearchTextChange={searchText => {
        fuse.search(searchText);
        recentFuse.search(searchText);
      }}
    >
      {fuse.results.length ? (
        projects.map(renderProjectItem)
      ) : (
        <List.EmptyView title="No projects found" />
      )}
    </List>
  );
}
