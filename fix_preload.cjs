const fs = require('fs');
const path = './electron/preload.ts';
let content = fs.readFileSync(path, 'utf8');

// Insert log API into preload
if (!content.includes('log: (level: string, ...args: any[])')) {
  content = content.replace(
    'app: {',
    'app: {\n    log: (level: string, ...args: any[]) => ipcRenderer.invoke("app:log", level, ...args),'
  );
  fs.writeFileSync(path, content);
}
