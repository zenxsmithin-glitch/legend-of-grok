export type SystemLine = { id: string; body: string; at: number };

const lines: SystemLine[] = [];
const waiters = new Set<() => void>();

export function systemLines(): SystemLine[] {
  return lines;
}

export function logSystem(body: string) {
  lines.push({ id: crypto.randomUUID(), body, at: Date.now() });
  if (lines.length > 80) lines.shift();
  waiters.forEach((fn) => fn());
}

export function onSystem(fn: () => void) {
  waiters.add(fn);
  return () => {
    waiters.delete(fn);
  };
}
