import { Action, ActionPanel, Form, Icon, showToast, Toast, Clipboard, environment } from '@vicinae/api';
import { useState } from 'react';
import fs from 'fs';
import path from 'path';
import { useRequest } from 'ahooks';

const FILE_TYPES = [
  { id: 'txt', label: '文本文件 (.txt)', extension: 'txt' },
  { id: 'md', label: 'Markdown (.md)', extension: 'md' },
  { id: 'json', label: 'JSON (.json)', extension: 'json' },
  { id: 'js', label: 'JavaScript (.js)', extension: 'js' },
  { id: 'ts', label: 'TypeScript (.ts)', extension: 'ts' },
  { id: 'html', label: 'HTML (.html)', extension: 'html' },
  { id: 'css', label: 'CSS (.css)', extension: 'css' },
  { id: 'py', label: 'Python (.py)', extension: 'py' },
  { id: 'sh', label: 'Shell Script (.sh)', extension: 'sh' },
  { id: 'xml', label: 'XML (.xml)', extension: 'xml' },
  { id: 'yaml', label: 'YAML (.yaml)', extension: 'yaml' },
  { id: 'csv', label: 'CSV (.csv)', extension: 'csv' },
  { id: 'svg', label: 'SVG (.svg)', extension: 'svg' },
];

const SVG_NS = 'http://www.w3.org/2000/svg';

function ensureSvgNamespace(content: string): string {
  const trimmed = content.trim();

  // 检查是否已包含 xmlns 命名空间
  if (trimmed.includes('xmlns=') || trimmed.includes('xmlns:')) {
    return trimmed;
  }

  // 检查是否是 SVG 标签
  const svgMatch = trimmed.match(/<svg\b/i);
  if (!svgMatch) {
    return trimmed;
  }

  // 在 <svg 标签后添加 xmlns 属性
  return trimmed.replace(/<svg\b/i, `<svg xmlns="${SVG_NS}"`);
}

export function TextToFileComponent() {
  const [text, setText] = useState('');
  const [fileType, setFileType] = useState('txt');

  const getFile = () => {
    const extension = FILE_TYPES.find(t => t.id === fileType)?.extension || 'txt';

    // 处理 SVG 命名空间
    let contentToWrite = text;
    if (fileType === 'svg') {
      contentToWrite = ensureSvgNamespace(text);
    }

    return {
      extension,
      content: contentToWrite,
    };
  };

  const { loading, runAsync } = useRequest(
    async (copy: boolean) => {
      if (!text.trim()) {
        return;
      }

      try {
        const file = getFile();
        if (copy) {
          const fileName = `tmp-text-to-file.${file.extension}`;
          const filePath = path.join(environment.supportPath, fileName);

          fs.writeFileSync(filePath, file.content, 'utf-8');
          await Clipboard.copy({ file: filePath });

          await showToast({
            style: Toast.Style.Success,
            title: '已复制文件到剪贴板',
            message: fileName,
          });
          return;
        }

      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: '复制失败',
          message: String(error),
        });
      }
    },
    { manual: true },
  );

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action
            title="Copy"
            icon={Icon.CopyClipboard}
            onAction={() => runAsync(true)}
            shortcut={{ modifiers: ['cmd'], key: 'return' }}
          />
          {/* TODO 暂不支持 */}
          {/*<Action
            title="Save"
            icon={Icon.BlankDocument}
            onAction={() => runAsync(false)}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'return' }}
          />*/}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="fileType" title="Type" value={fileType} onChange={setFileType}>
        {FILE_TYPES.map(type => (
          <Form.Dropdown.Item key={type.id} value={type.id} title={type.label} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="text"
        title="Content"
        placeholder="Enter text content here..."
        value={text}
        onChange={setText}
      />
    </Form>
  );
}
