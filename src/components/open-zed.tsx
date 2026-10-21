import { Action, ActionPanel, Color, getApplications, Icon, List, open } from '@vicinae/api';
import { useMemoizedFn, useRequest } from 'ahooks';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { loadCodeProjects, loadZedRecentProjects, useFuse, useRecentItems, type ILocalProject } from '../cmn';
import { useMemo } from 'react';

const execFileAsync = promisify(execFile);
const ZedRecentProjectsKey = 'open-zed/recent-projects';

/** 列表项来源，决定展示样式。 */
type ZedProjectSource = 'zed' | 'dir';

interface ZedProjectItem extends ILocalProject {
  /** Zed 多根 workspace 里除主目录外的其余根目录。 */
  extraPaths?: string[];
  source: ZedProjectSource;
  /** 是否在 dbox 自己的最近记录里，用于排序与角标。 */
  isRecent: boolean;
}

/**
 * 项目身份：根目录集合（排序后）而非首根路径。
 * 多根 workspace 与独立项目可能共用首根，按路径去重会把独立项目吞掉。
 */
const getProjectIdentity = (project: Pick<ZedProjectItem, 'path' | 'extraPaths'>) =>
  [project.path, ...(project.extraPaths || [])].toSorted().join('\n');

export interface OpenZedCommandProps {
  actionTitle: string;
}

export function OpenZedCommand({ actionTitle }: OpenZedCommandProps) {
  const { data: codeProjects = [], loading: isLoading } = useRequest(loadCodeProjects);
  const {
    items: recentProjects,
    addItem: addRecentProject,
    isIniting: isRecentProjectsIniting,
  } = useRecentItems<ZedProjectItem>(ZedRecentProjectsKey, getProjectIdentity);

  const zedProjects = useMemo<ZedProjectItem[]>(
    () =>
      loadZedRecentProjects().map<ZedProjectItem>(project => ({
        name: project.name,
        path: project.path,
        extraPaths: project.extraPaths,
        isWorkspace: false,
        source: 'zed',
        isRecent: false,
      })),
    [],
  );

  const dirProjects = useMemo<ZedProjectItem[]>(
    () => codeProjects.map<ZedProjectItem>(project => ({ ...project, source: 'dir', isRecent: false })),
    [codeProjects],
  );

  // 整合成一个稳定列表：dbox 最近记录置顶，其余按来源分组后按字母升序。
  // source 属于数据本身，搜索只改变可见子集，不会再让标签在筛选时翻转。
  const allProjects = useMemo(() => {
    if (isRecentProjectsIniting) return [];

    // 同身份时以实际目录项为准：dirProjects 后写入 Map，覆盖 zedProjects。
    const projectsByIdentity = new Map(
      [...zedProjects, ...dirProjects].map(project => [getProjectIdentity(project), project] as const),
    );
    const recentItems = recentProjects.flatMap(project => {
      const currentProject = projectsByIdentity.get(getProjectIdentity(project));
      return currentProject ? [{ ...currentProject, isRecent: true }] : [];
    });

    const seenIdentities = new Set(recentItems.map(getProjectIdentity));
    // dir 在前，同一身份的 zed 项被淘汰，只保留实际目录项。
    const rest = [...dirProjects, ...zedProjects]
      .filter(project => {
        const identity = getProjectIdentity(project);
        if (seenIdentities.has(identity)) return false;
        seenIdentities.add(identity);
        return true;
      })
      .toSorted((a, b) => (a.source === b.source ? a.name.localeCompare(b.name) : a.source === 'dir' ? -1 : 1));

    return [...recentItems, ...rest];
  }, [dirProjects, isRecentProjectsIniting, recentProjects, zedProjects]);

  const fuse = useFuse(allProjects, { keys: ['name', 'path'], maxResults: 200 });
  const projects = fuse.results;

  const openProject = useMemoizedFn(async (project: ZedProjectItem) => {
    addRecentProject(project);

    if (project.source === 'zed' || project.extraPaths?.length) {
      // Zed CLI 接受多个根目录，等价于在 Zed 里打开一个多根 workspace。
      await execFileAsync('zed', [project.path, ...(project.extraPaths || [])]);
    } else {
      const applications = await getApplications(project.path).catch(() => []);
      const targetApplication = applications.find(candidate => candidate.name.toLowerCase() === 'zed');
      await open(project.path, targetApplication);
    }
  });

  const renderProjectItem = (project: ZedProjectItem) => (
    <List.Item
      key={getProjectIdentity(project)}
      title={`${project.isWorkspace ? '[📂] ' : ''}${project.name}`}
      subtitle={project.extraPaths?.length ? `${project.path}, ${project.extraPaths.join(', ')}` : project.path}
      keywords={[project.source === 'zed' ? 'zed history' : 'dir']}
      icon={project.source === 'zed' ? Icon.Clock : Icon.Folder}
      accessories={[
        {
          tag: {
            value: project.source === 'zed' ? 'Zed History' : 'Dir',
            color: project.source === 'zed' ? Color.Blue : Color.Green,
          },
        },
        ...(project.isRecent ? [{ icon: Icon.Clock, tooltip: 'Recently opened' }] : []),
      ]}
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
      searchBarPlaceholder="Search Zed project..."
      searchText={fuse.query}
      onSearchTextChange={fuse.search}
    >
      {projects.length ? projects.map(renderProjectItem) : <List.EmptyView title="No projects found" />}
    </List>
  );
}
