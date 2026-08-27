import { OpenProjectCommand } from '../components/open-project';
import { Icon } from '@vicinae/api';
import { ISubCommandConfig } from '../i/command';

function Command() {
  return <OpenProjectCommand application="Zed" actionTitle="Open In Zed" />;
}

export const openZedCommand: ISubCommandConfig = {
  id: 'open-zed',
  title: 'Open Zed',
  subtitle: 'Open project in Zed editor',
  icon: 'zed.png',
  component: Command,
};
