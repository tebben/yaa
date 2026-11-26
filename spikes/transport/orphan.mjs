// Does the core outlive a main process that is killed with SIGKILL?
import { app, utilityProcess } from 'electron';
import path from 'node:path';
app.whenReady().then(() => {
  const core = utilityProcess.fork(path.join(import.meta.dirname, 'core.mjs'), [], { serviceName: 'yaa-core' });
  core.on('spawn', () => console.log(JSON.stringify({ main: process.pid, core: core.pid })));
});
