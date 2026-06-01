const SENSITIVE_KEY_PATTERN = /(password|token|authorization|cookie|secret)/i;

type LogValue = Record<string, unknown> | undefined;

const sanitize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, nested]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        acc[key] = '[REDACTED]';
        return acc;
      }

      acc[key] = sanitize(nested);
      return acc;
    }, {});
  }

  return value;
};

export const redactForLogs = <T extends LogValue>(value: T): T => {
  if (!value) {
    return value;
  }

  return sanitize(value) as T;
};

export type Logger = {
  info: (message: string, fields?: LogValue) => void;
  warn: (message: string, fields?: LogValue) => void;
  error: (message: string, fields?: LogValue) => void;
};

export const createLogger = (service: string): Logger => {
  const write = (level: 'info' | 'warn' | 'error', message: string, fields?: LogValue) => {
    const payload: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      service,
      message
    };

    if (fields) {
      Object.assign(payload, redactForLogs(fields));
    }

    console.log(JSON.stringify(payload));
  };

  return {
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields)
  };
};
