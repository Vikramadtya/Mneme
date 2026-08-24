import { createRequire } from 'module';
const req = createRequire(import.meta.url);

const cp = req('node:child_process');
const originalSpawn = cp.spawn;
cp.spawn = function(command, args, options) {
  options = options || {};
  if (options.stdio === undefined) {
    options.stdio = ['ignore', 'pipe', 'pipe'];
  }
  console.log("SPAWN OPTIONS:", options);
  return originalSpawn.call(this, command, args, options);
}

const sg = req('simple-git')('/tmp');
sg.checkIsRepo().catch(() => {});
