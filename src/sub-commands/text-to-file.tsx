import { ISubCommandConfig } from '../i/command';
import { TextToFileComponent } from '../components/text-to-file';
import { Icon } from '@vicinae/api';

export const textToFileCommand: ISubCommandConfig = {
  id: 'text-to-file',
  title: 'Text to File',
  subtitle: 'Copy text content to clipboard or save as local file',
  icon: Icon.BlankDocument,
  component: TextToFileComponent,
};
