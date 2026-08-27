import { Image } from '@vicinae/api';

export interface IUrlItem {
  id: string;
  name: string;
  url: string;
  icon?: Image.ImageLike;
}

export interface ISubCommandConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: Image.ImageLike;
  component?: React.ElementType;
  /** Whether text after the double-space separator should be passed to the component. */
  acceptsParam?: boolean;
  quickOpenUrl?: IUrlItem;
  renderActions?: (opt: { push: () => void }) => React.ReactNode;
}
