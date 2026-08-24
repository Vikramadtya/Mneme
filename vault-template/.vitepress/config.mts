import { withMermaid } from 'vitepress-plugin-mermaid';
import fs from 'node:fs';
import path from 'node:path';

function getSidebar(dir, baseDir = dir) {
  const items = [];
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.startsWith('.') || file === 'assets' || file === 'node_modules') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const children = getSidebar(fullPath, baseDir);
        if (children.length > 0) {
          items.push({
            text: file,
            collapsed: false,
            items: children
          });
        }
      } else if (file.endsWith('.md') && file !== 'index.md' && file !== 'README.md') {
        items.push({
          text: file.replace('.md', ''),
          link: '/' + path.relative(baseDir, fullPath).replace(/\\/g, '/').replace(/\.md$/, '')
        });
      }
    }
  } catch (e) {
    console.error("Error reading directory:", e);
  }
  return items;
}

// When running `vitepress dev .`, process.cwd() is the vault directory.
const rootDir = process.cwd();

/** @type {import('vitepress').UserConfig} */
const config = {
  title: 'My Vault',
  description: 'A personal knowledge base powered by Memoriser',
  themeConfig: {
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Home', link: '/' }
    ],
    sidebar: getSidebar(rootDir),
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Vikramadtya/Mneme' }
    ]
  },
  markdown: {
    math: true
  }
};

export default withMermaid(config);
