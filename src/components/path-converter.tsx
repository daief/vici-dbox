import { Action, ActionPanel, Icon, List } from '@vicinae/api';
import { useMemo, useState } from 'react';

interface PathFormatItem {
  id: string;
  title: string;
  value: string;
}

function toUnixPath(rawPath: string): string {
  const input = rawPath.trim();
  if (!input) return '';

  const isUncPath = /^\\+/.test(input) || /^\/\/+/.test(input);
  const unixPath = input.replace(/\\/g, '/').replace(/\/+/g, '/');

  if (isUncPath) {
    return `//${unixPath.replace(/^\/+/, '')}`;
  }

  return unixPath;
}

function toWindowsPath(rawPath: string): string {
  const unixPath = toUnixPath(rawPath);
  if (!unixPath) return '';

  const unixDriveMatch = unixPath.match(/^\/([A-Za-z])(?:\/(.*))?$/);
  if (unixDriveMatch) {
    const drive = unixDriveMatch[1].toUpperCase();
    const rest = unixDriveMatch[2] ? `\\${unixDriveMatch[2].replace(/\//g, '\\')}` : '';
    return `${drive}:${rest}`;
  }

  if (unixPath.startsWith('//')) {
    return `\\\\${unixPath.slice(2).replace(/\//g, '\\')}`;
  }

  return unixPath.replace(/\//g, '\\');
}

function toUnixDrivePath(rawPath: string): string {
  const unixPath = toUnixPath(rawPath);
  if (!unixPath) return '';

  const winDriveMatch = unixPath.match(/^([A-Za-z]):(?:\/(.*))?$/);
  if (winDriveMatch) {
    const drive = winDriveMatch[1].toUpperCase();
    const rest = winDriveMatch[2] ? `/${winDriveMatch[2]}` : '';
    return `/${drive}${rest}`;
  }

  const unixDriveMatch = unixPath.match(/^\/([A-Za-z])(?:\/(.*))?$/);
  if (unixDriveMatch) {
    const drive = unixDriveMatch[1].toUpperCase();
    const rest = unixDriveMatch[2] ? `/${unixDriveMatch[2]}` : '';
    return `/${drive}${rest}`;
  }

  return unixPath;
}

function toEscapedWindowsPath(rawPath: string): string {
  const windowsPath = toWindowsPath(rawPath);
  if (!windowsPath) return '';
  return windowsPath.replace(/\\/g, '\\\\');
}

export function PathConverterCommand() {
  const [inputPath, setInputPath] = useState('');

  const items = useMemo<PathFormatItem[]>(() => {
    const windowsPath = toWindowsPath(inputPath);
    const unixPath = toUnixPath(inputPath);
    const unixDrivePath = toUnixDrivePath(inputPath);
    const escapedWindowsPath = toEscapedWindowsPath(inputPath);

    if (!inputPath.trim()) {
      return [];
    }

    return [
      {
        id: 'windows',
        title: '标准 Windows 风格',
        value: windowsPath,
      },
      {
        id: 'unix',
        title: '标准 Unix 风格',
        value: unixPath,
      },
      {
        id: 'unix-drive',
        title: '盘符 Unix 风格 (/C/...)',
        value: unixDrivePath,
      },
      {
        id: 'windows-escaped',
        title: '双斜杆 Windows 风格',
        value: escapedWindowsPath,
      },
    ];
  }, [inputPath]);

  return (
    <List
      searchBarPlaceholder={'输入 Windows 或 Unix 路径...'}
      searchText={inputPath}
      onSearchTextChange={setInputPath}
      filtering={false}
      isShowingDetail
    >
      {items.length ? (
        items.map(item => (
          <List.Item
            key={item.id}
            title={item.title}
            icon={Icon.BlankDocument}
            detail={<List.Item.Detail markdown={`\`\`\`text\n${item.value}\n\`\`\``} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Path" content={item.value} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView title="请输入路径" description="支持 Windows 和 Unix 路径风格" icon={Icon.Compass} />
      )}
    </List>
  );
}
