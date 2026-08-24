import { createRequire } from 'module';
const req = createRequire(import.meta.url);

const cp = req('node:child_process');
cp.spawn = function() { console.log("PATCHED"); }

const sg = req('simple-git')('/tmp');
sg.checkIsRepo().catch(() => {});
