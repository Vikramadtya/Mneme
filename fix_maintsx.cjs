const fs = require('fs');
const path = './src/main.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('const originalConsoleLog = console.log')) {
  const interceptionCode = `
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

if (window.api && window.api.app && window.api.app.log) {
  console.log = (...args) => {
    originalConsoleLog(...args);
    window.api.app.log('info', ...args).catch(() => {});
  };
  console.warn = (...args) => {
    originalConsoleWarn(...args);
    window.api.app.log('warn', ...args).catch(() => {});
  };
  console.error = (...args) => {
    originalConsoleError(...args);
    window.api.app.log('error', ...args).catch(() => {});
  };
}
`;

  content = content.replace(
    'createRoot(document.getElementById("root")!).render(',
    interceptionCode + '\ncreateRoot(document.getElementById("root")!).render('
  );
  fs.writeFileSync(path, content);
}
