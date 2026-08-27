import { Icon } from '@vicinae/api';
import { ISubCommandConfig, IUrlItem } from '../i/command';

// 资料
// 网站图标获取服务： https://blog.heyfe.org/blog/chrome-extension-favicon
const defaultUrls: IUrlItem[] = [
  {
    id: 'google',
    name: 'Google Search',
    url: 'https://www.google.com/search?q={query}',
    icon: Icon.Google,
  },
  {
    id: 'github',
    name: 'GitHub Search',
    url: 'https://github.com/search?q={query}',
    icon: Icon.Github,
  },
  {
    id: 'stackoverflow',
    name: 'Stack Overflow',
    url: 'https://stackoverflow.com/search?q={query}',
    icon: Icon.Stackoverflow,
  },
];

// 将 urls 平铺导出为多个 command
export const quickOpenUrlCommands: ISubCommandConfig[] = defaultUrls.map<ISubCommandConfig>(url => ({
  id: `quick-open-url-${url.id}`,
  title: url.name,
  subtitle: `Quick Open: ${url.url}`,
  icon: url.icon || Icon.Link,
  quickOpenUrl: url,
}));
