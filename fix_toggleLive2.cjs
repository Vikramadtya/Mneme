const fs = require('fs');
const path = './electron/handlers/AppHandlers.ts';
let content = fs.readFileSync(path, 'utf8');

const replacement = `
          mkdocsProcess.stdout?.on("data", (data) => {
            console.log("[MkDocs STDOUT]:", data.toString().trim());
            fs.appendFile(logPath, data.toString()).catch(() => {});
          });
          mkdocsProcess.stderr?.on("data", (data) => {
            console.error("[MkDocs STDERR]:", data.toString().trim());
            fs.appendFile(logPath, data.toString()).catch(() => {});
          });
`;

content = content.replace(/          mkdocsProcess\.stdout\?\.on\("data", \(data\) => \{\s+fs\.appendFile\(logPath, data\.toString\(\)\)\.catch\(\(\) => \{\}\);\s+\}\);\s+mkdocsProcess\.stderr\?\.on\("data", \(data\) => \{\s+fs\.appendFile\(logPath, data\.toString\(\)\)\.catch\(\(\) => \{\}\);\s+\}\);/, replacement);
fs.writeFileSync(path, content);
