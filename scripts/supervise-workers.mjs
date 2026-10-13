import { spawn } from 'node:child_process';

const targets = [
  { name: 'ingestion', entry: 'services/ingestion/src/index.js' },
  { name: 'prediction', entry: 'services/prediction/src/index.js' },
];

const RESTART_DELAY_MS = Number(process.env.WORKER_RESTART_DELAY_MS ?? 5000);
const MAX_RESTARTS = Number(process.env.WORKER_MAX_RESTARTS ?? 10);
const children = new Map();
let shuttingDown = false;

for (const target of targets) {
  const child = spawn(process.execPath, [target.entry], {
    stdio: 'inherit',
    env: process.env,
  });
  children.set(target, { child, restarts: 0 });
  wire(target);
}

function wire(target) {
  const record = children.get(target);
  record.child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    record.restarts += 1;
    const label = `${target.name} (restarts: ${record.restarts}/${MAX_RESTARTS})`;
    if (record.restarts > MAX_RESTARTS) {
      console.error(`${label} exited with code ${code} signal ${signal}; restart limit reached, giving up.`);
      shutdown(code ?? 1);
      return;
    }
    console.error(`${label} exited with code ${code} signal ${signal}; restarting in ${RESTART_DELAY_MS}ms.`);
    setTimeout(() => {
      if (shuttingDown) return;
      const next = spawn(process.execPath, [target.entry], {
        stdio: 'inherit',
        env: process.env,
      });
      record.child = next;
      wire(target);
    }, RESTART_DELAY_MS);
  });

  record.child.on('error', (error) => {
    console.error(`${target.name} failed to start: ${error.message}`);
  });
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of children.values()) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 10_000);
}

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));
