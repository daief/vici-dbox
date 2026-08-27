import { OpenProjectCommand } from '../components/open-project';
import { Icon } from '@vicinae/api';
import { ISubCommandConfig } from '../i/command';

function Command() {
  return <OpenProjectCommand application="Visual Studio Code" actionTitle="Open In VSCode" />;
}

export const openVscodeCommand: ISubCommandConfig = {
  id: 'open-vscode',
  title: 'Open VSCode',
  subtitle: 'Open project in Visual Studio Code',
  icon: Icon.Vscode,
  component: Command,
};
