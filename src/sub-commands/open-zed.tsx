import { OpenZedCommand } from '../components/open-zed';
import { ISubCommandConfig } from '../i/command';

function Command() {
  return <OpenZedCommand actionTitle="Open In Zed" />;
}

export const openZedCommand: ISubCommandConfig = {
  id: 'open-zed',
  title: 'Open Zed',
  subtitle: 'Open project in Zed editor',
  icon: 'zed.png',
  component: Command,
};
