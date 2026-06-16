/* Minimal timestamped logger. Keeps deps to zero. */
type Level = 'info' | 'warn' | 'error' | 'debug';

function emit(level: Level, scope: string, args: unknown[]) {
  const ts = new Date().toISOString().slice(11, 19);
  const tag = `${ts} ${level.toUpperCase().padEnd(5)} [${scope}]`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(tag, ...args);
}

export function createLogger(scope: string) {
  return {
    info: (...a: unknown[]) => emit('info', scope, a),
    warn: (...a: unknown[]) => emit('warn', scope, a),
    error: (...a: unknown[]) => emit('error', scope, a),
    debug: (...a: unknown[]) => {
      if (process.env.DEBUG) emit('debug', scope, a);
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
