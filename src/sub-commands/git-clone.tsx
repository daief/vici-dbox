import { Action, ActionPanel, Form, Icon, showHUD, showToast, Toast } from '@vicinae/api';
import { execFile } from 'child_process';
import { useMemo, useState } from 'react';
import { promisify } from 'util';
import { useRequest } from 'ahooks';
import { uniq } from 'es-toolkit';
import { settings } from '../cmn';
import { ISubCommandConfig } from '../i/command';

const execFileAsync = promisify(execFile);

const getCodeDirectories = () =>
  uniq(
    (settings.codeDir || '')
      .split(',')
      .map(directory => directory.trim())
      .filter(Boolean),
  );

function GitCloneCommand({ param }: { param?: string }) {
  const codeDirectories = useMemo(getCodeDirectories, []);
  const [gitUrl, setGitUrl] = useState(param || '');
  const [directory, setDirectory] = useState(codeDirectories[0] || '');
  const [depth, setDepth] = useState('');

  const { loading: isCloning, run: clone } = useRequest(
    async () => {
      const url = gitUrl.trim();
      if (!url) {
        await showToast({ style: Toast.Style.Failure, title: 'Git URL is required' });
        return;
      }
      if (!directory) return;

      const depthValue = depth.trim();
      if (depthValue && (!/^\d+$/.test(depthValue) || Number(depthValue) < 1)) {
        await showToast({ style: Toast.Style.Failure, title: 'Depth must be a positive integer' });
        return;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: 'Cloning repository…' });
      try {
        await execFileAsync('git', ['clone', ...(depthValue ? ['--depth', depthValue] : []), url], { cwd: directory });
        await showHUD('Repository cloned');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.style = Toast.Style.Failure;
        toast.title = 'Git clone failed';
        toast.message = message;
      }
    },
    { manual: true },
  );

  if (!codeDirectories.length) {
    return (
      <Form navigationTitle="Git Clone">
        <Form.Description
          title="Code directory required"
          text="Configure the Code directory preference before cloning a repository."
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isCloning}
      navigationTitle="Git Clone"
      actions={
        <ActionPanel>
          <Action title="Clone Repository" icon={Icon.Download} onAction={clone} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="gitUrl"
        title="Git URL"
        placeholder="https://github.com/owner/repository.git"
        value={gitUrl}
        onChange={setGitUrl}
      />
      <Form.Dropdown id="directory" title="Clone into" value={directory} onChange={setDirectory}>
        {codeDirectories.map(codeDirectory => (
          <Form.Dropdown.Item key={codeDirectory} value={codeDirectory} title={codeDirectory} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="depth"
        title="Depth"
        placeholder="Optional; leave empty to clone full history"
        value={depth}
        onChange={setDepth}
      />
    </Form>
  );
}

export const gitCloneCommand: ISubCommandConfig = {
  id: 'git-clone',
  title: 'Git Clone',
  subtitle: 'Clone a Git repository into a code directory',
  icon: Icon.Git,
  component: GitCloneCommand,
  acceptsParam: true,
};
