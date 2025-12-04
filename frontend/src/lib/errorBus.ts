export type ErrorEvent = {
  message: string;
  status?: number;
  url?: string;
  method?: string;
};

const listeners = new Set<(e: ErrorEvent) => void>();

export function onError(listener: (e: ErrorEvent) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitError(e: ErrorEvent) {
  listeners.forEach((l) => {
    try { l(e); } catch {}
  });
}
