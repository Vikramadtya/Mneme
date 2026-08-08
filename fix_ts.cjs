const fs = require('fs');

let mainPath = './src/main.tsx';
let mainContent = fs.readFileSync(mainPath, 'utf8');
mainContent = mainContent.replace(/window\.api/g, '(window as any).api');
fs.writeFileSync(mainPath, mainContent);

let ipcPath = './src/api/ipcClient.ts';
let ipcContent = fs.readFileSync(ipcPath, 'utf8');
ipcContent = ipcContent.replace(/window\.api\.app\.log/g, '(window as any).api.app.log');
fs.writeFileSync(ipcPath, ipcContent);
