import { Action, ActionPanel, Icon, List, open, useNavigation } from '@vicinae/api';
import { useMemoizedFn } from 'ahooks';
import { useEffect, useMemo, useState } from 'react';

import { useFuse, useRecentItems } from './cmn';
import { ISubCommandConfig } from './i/command';
import { openVscodeCommand } from './sub-commands/open-vscode';
import { openZedCommand } from './sub-commands/open-zed';
import { quickOpenUrlCommands } from './sub-commands/quick-open-url';
import { textToFileCommand } from './sub-commands/text-to-file';
import { pathConverterCommand } from './sub-commands/path-converter';
import { gitCloneCommand } from './sub-commands/git-clone';
import { calendarCommand } from './sub-commands/calendar';

const baseMenuItems: ISubCommandConfig[] = [
  openVscodeCommand,
  openZedCommand,
  textToFileCommand,
  pathConverterCommand,
  gitCloneCommand,
  calendarCommand,
  ...quickOpenUrlCommands,
];

// 解析搜索文本：以最后连续两个以上空格分隔，前面用于筛选命令，后面作为参数
function parseSearchText(text: string): { filterQuery: string; param: string } {
  // 匹配最后出现的连续两个及以上空格
  const match = text.match(/^(.*?)\s{2,}(.*)$/);
  if (match) {
    return {
      filterQuery: match[1].trim(),
      param: match[2],
    };
  }
  return {
    filterQuery: text,
    param: '',
  };
}

const CommandItem: React.FC<{
  item: ISubCommandConfig;
  param?: string;
  isRecent?: boolean;
  onPush?: (item: ISubCommandConfig) => void;
}> = ({ item, param, isRecent, onPush }) => {
  const isQuickOpenUrl = item.quickOpenUrl?.url;
  const handlePush = useMemoizedFn(() => onPush?.(item));

  return (
    <List.Item
      key={item.id}
      title={item.title}
      subtitle={param && (isQuickOpenUrl || item.acceptsParam) ? `参数: ${param}` : item.subtitle}
      icon={item.icon}
      accessories={isRecent ? [{ icon: Icon.Clock, tooltip: 'Recently used' }] : []}
      actions={
        <ActionPanel>
          <Action
            title={isQuickOpenUrl ? 'Open in Browser' : 'Open'}
            icon={isQuickOpenUrl ? Icon.Globe01 : Icon.ArrowRight}
            onAction={handlePush}
          />
          {item.renderActions?.({ push: handlePush })}
        </ActionPanel>
      }
    />
  );
};

export default function DboxCommand() {
  const { push } = useNavigation();
  const [rawSearchText, setRawSearchText] = useState('');
  const {
    items: recentCommandIds,
    addItem: addToRecent,
    isIniting,
  } = useRecentItems<string>('dbox/recent-commands', item => item);

  // 解析搜索文本
  const { filterQuery, param } = useMemo(() => parseSearchText(rawSearchText), [rawSearchText]);

  // 使用 fuse 来筛选命令（只用 filterQuery 部分）
  const menuItems = baseMenuItems;
  const fuse = useFuse(menuItems, { keys: ['title', 'subtitle'], maxResults: 1000 });

  // 同步 fuse 的查询
  const fuseResults = useMemo(() => {
    if (filterQuery) {
      return fuse.results;
    }
    return menuItems;
  }, [fuse.results, filterQuery, menuItems]);

  // 当 filterQuery 变化时更新 fuse
  useEffect(() => {
    fuse.search(filterQuery);
  }, [filterQuery]);

  // 按最近使用排序 fuse 结果
  const sortedFuseResults = useMemo(() => {
    if (isIniting) return [];

    const recentSet = new Set(recentCommandIds);
    const recentItems: ISubCommandConfig[] = [];
    const otherItems: ISubCommandConfig[] = [];

    for (const item of fuseResults) {
      if (recentSet.has(item.id)) {
        recentItems.push(item);
      } else {
        otherItems.push(item);
      }
    }

    // 按最近使用顺序排序
    recentItems.sort((a, b) => {
      return recentCommandIds.indexOf(a.id) - recentCommandIds.indexOf(b.id);
    });

    return [...recentItems, ...otherItems];
  }, [fuseResults, recentCommandIds, isIniting]);

  const handlePush = useMemoizedFn((item: ISubCommandConfig) => {
    // 添加到最近使用
    addToRecent(item.id);

    // 检查是否是 quick open url 项
    if (item.quickOpenUrl) {
      const finalUrl = item.quickOpenUrl.url.replace('{query}', encodeURIComponent(param || filterQuery));
      open(finalUrl);
      return;
    }
    // 其他命令需要 component
    if (item.component) {
      push(<item.component param={item.acceptsParam ? param : undefined} />);
    }
  });

  return (
    <List
      searchBarPlaceholder="筛选命令  参数（双空格分隔）..."
      searchText={rawSearchText}
      onSearchTextChange={setRawSearchText}
      throttle
      filtering={false}
    >
      {sortedFuseResults.map(item => {
        const isQuickOpenUrl = !!item.quickOpenUrl;
        const isRecent = recentCommandIds.includes(item.id);
        return (
          <CommandItem
            key={item.id}
            item={item}
            param={isQuickOpenUrl && filterQuery ? param : ''}
            isRecent={isRecent}
            onPush={handlePush}
          />
        );
      })}
    </List>
  );
}
