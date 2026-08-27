import { Icon } from '@vicinae/api';
import { ISubCommandConfig } from '../i/command';
import { PathConverterCommand } from '../components/path-converter';

export const pathConverterCommand: ISubCommandConfig = {
  id: 'path-converter',
  title: 'Path Converter',
  subtitle: 'Convert Windows/Unix path formats and quick copy',
  icon: Icon.TextCursor,
  component: PathConverterCommand,
};
