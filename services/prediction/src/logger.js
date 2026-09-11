const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

function emit(level, context, message, extra) {
  if (LEVELS[level] < LEVELS[LOG_LEVEL]) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    context,
    msg: message,
    ...extra,
  };

  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

export function createLogger(context) {
  return {
    debug: (msg, extra) => emit('debug', context, msg, extra),
    info: (msg, extra) => emit('info', context, msg, extra),
    warn: (msg, extra) => emit('warn', context, msg, extra),
    error: (msg, extra) => emit('error', context, msg, extra),
  };
}
