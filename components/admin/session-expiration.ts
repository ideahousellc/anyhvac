type ExpirationMonitorOptions = {
  deadline: number;
  onExpire: () => void;
  now?: () => number;
  schedule?: (callback: () => void, delay: number) => number;
  cancel?: (handle: number) => void;
  windowTarget?: Pick<Window, "addEventListener" | "removeEventListener">;
  documentTarget?: Pick<Document, "addEventListener" | "removeEventListener">;
  isDocumentVisible?: () => boolean;
};

export function getClientExpirationDeadline(
  expiresAt: number,
  serverNow: number,
  clientNow = Date.now(),
) {
  return clientNow + Math.max(0, expiresAt - serverNow);
}

export function startAdminSessionExpirationMonitor({
  deadline,
  onExpire,
  now = Date.now,
  schedule = (callback, delay) => window.setTimeout(callback, delay),
  cancel = (handle) => window.clearTimeout(handle),
  windowTarget = window,
  documentTarget = document,
  isDocumentVisible = () => document.visibilityState === "visible",
}: ExpirationMonitorOptions) {
  let expired = false;

  const expire = () => {
    if (expired) return;
    expired = true;
    onExpire();
  };
  const checkExpiration = () => {
    if (now() >= deadline) expire();
  };
  const handleVisibility = () => {
    if (isDocumentVisible()) checkExpiration();
  };

  const timer = schedule(expire, Math.max(0, deadline - now()));
  windowTarget.addEventListener("focus", checkExpiration);
  windowTarget.addEventListener("pageshow", checkExpiration);
  documentTarget.addEventListener("visibilitychange", handleVisibility);

  return () => {
    cancel(timer);
    windowTarget.removeEventListener("focus", checkExpiration);
    windowTarget.removeEventListener("pageshow", checkExpiration);
    documentTarget.removeEventListener("visibilitychange", handleVisibility);
  };
}

export function handleAdminUnauthorized(
  status: number,
  redirectToLogin: () => void,
) {
  if (status !== 401) return false;
  redirectToLogin();
  return true;
}
