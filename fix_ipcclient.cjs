const fs = require('fs');
const path = './src/api/ipcClient.ts';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('log: (level: string, ...args: any[])')) {
  content = content.replace(
    'app: {',
    'app: {\n    log: (level: string, ...args: any[]) => window.api.app.log(level, ...args),'
  );
  fs.writeFileSync(path, content);
}
