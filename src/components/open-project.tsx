import { Action, ActionPanel, getApplications, Icon, List, open } from '@vicinae/api';
import { useMemoizedFn, useRequest } from 'ahooks';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getWorkspaceFolders, loadCodeProjects, type ILocalProject, useFuse, useRecentItems } from '../cmn';
import { useMemo } from 'react';

const execFileAsync = promisify(execFile);
const RecentProjectsKey = 'open-project/recent-projects';
const MaxRecentProjectCount = 5;

export interface OpenProjectCommandProps {
  application: string;
  actionTitle: string;
}

const quoteNushellArgument = (value: string) => `'${value.replaceAll("'", "''")}'`;

export function OpenProjectCommand({ application, actionTitle }: OpenProjectCommandProps) {
  const { data: allProjects = [], loading: isLoading } = useRequest(loadCodeProjects);
  const {
    items: recentProjects,
    addItem: addRecentProject,
    isIniting: isRecentProjectsIniting,
  } = useRecentItems<ILocalProject>(RecentProjectsKey, project => project.path, MaxRecentProjectCount);

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

  const openProject = useMemoizedFn(async (project: ILocalProject) => {
    addRecentProject(project);

    if (project.isWorkspace) {
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

  const renderProjectItem = (project: ILocalProject) => (
    <List.Item
      key={project.path}
      title={`${project.isWorkspace ? '[📂] ' : ''}${project.name}`}
      subtitle={project.path}
      icon={Icon.Folder}
      accessories={
        recentFuse.results.some(recentProject => recentProject.path === project.path)
          ? [{ icon: Icon.Clock, tooltip: 'Recently opened' }]
          : []
      }
      actions={
        <ActionPanel>
          <Action title={actionTitle} onAction={() => openProject(project)} />
          <Action.ShowInFinder title="Show In Finder" path={project.path} shortcut={{ modifiers: ['cmd'], key: 'f' }} />
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
      {fuse.results.length ? projects.map(renderProjectItem) : <List.EmptyView title="No projects found" />}
    </List>
  );
}