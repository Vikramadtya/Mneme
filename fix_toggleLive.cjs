const fs = require('fs');
const path = './electron/handlers/AppHandlers.ts';
let content = fs.readFileSync(path, 'utf8');

const replacement = `
          // Force kill any orphaned mkdocs serve processes on the same port before starting
          try {
            require('child_process').execSync('pkill -f "mkdocs serve --dev-addr 127.0.0.1:"' + livePort);
          } catch (e) {
            // pkill exits with 1 if no process found, which is fine
          }

          mkdocsProcess = spawn(
`;
content = content.replace('          mkdocsProcess = spawn(', replacement);
fs.writeFileSync(path, content);
