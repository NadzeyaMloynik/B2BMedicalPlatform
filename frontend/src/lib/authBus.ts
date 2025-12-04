type ForceLogoutListener = () => void;

const listeners = new Set<ForceLogoutListener>();

export function onForceLogout(listener: ForceLogoutListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitForceLogout() {
  listeners.forEach((l) => {
    try { l(); } catch {}
  });
}
