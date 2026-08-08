const fs = require('fs');

const files = [
    'src/application/hooks/useNotesState.ts',
    'src/application/hooks/useReviewState.ts',
    'src/application/hooks/useUIState.ts',
    'src/application/hooks/useVaultState.ts',
    'src/application/context/AppProvider.tsx',
    'src/components/ProjectLibrary.tsx',
    'src/components/ErrorBoundary.tsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/ipc\s*\.\s*invoke\(\s*["']([^:\"']+)?:([^\"']+)["']\s*(?:,\s*([\s\S]*?))?\)/g, (match, ns, action, args) => {
        if (!ns || !action) return match;
        // add to map
        if (ns === 'app' && (action === 'openExternal' || action === 'reportError')) {
            return args ? `ipcClient.app.${action}(${args})` : `ipcClient.app.${action}()`;
        }
        if (args) {
            return `ipcClient.${ns}.${action}(${args})`;
        } else {
            return `ipcClient.${ns}.${action}()`;
        }
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log("Fixed", file);
    }
}
