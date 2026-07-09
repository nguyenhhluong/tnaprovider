type Listener = () => void;

const onlineListeners: Set<Listener> = new Set();
const offlineListeners: Set<Listener> = new Set();

let _isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

export function isOnline(): boolean {
  return _isOnline;
}

export function onOnline(fn: Listener): () => void {
  onlineListeners.add(fn);
  return () => onlineListeners.delete(fn);
}

export function onOffline(fn: Listener): () => void {
  offlineListeners.add(fn);
  return () => offlineListeners.delete(fn);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    _isOnline = true;
    onlineListeners.forEach((fn) => fn());
  });
  window.addEventListener("offline", () => {
    _isOnline = false;
    offlineListeners.forEach((fn) => fn());
  });
}

// Install prompt
let _deferredPrompt: any = null;
let _installable = false;

export function isInstallable(): boolean {
  return _installable;
}

export function getDeferredPrompt(): any {
  return _deferredPrompt;
}

export function clearDeferredPrompt(): void {
  _deferredPrompt = null;
  _installable = false;
}

export function promptInstall(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!_deferredPrompt) {
      resolve(false);
      return;
    }
    _deferredPrompt.prompt();
    _deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      const accepted = choiceResult.outcome === "accepted";
      clearDeferredPrompt();
      resolve(accepted);
    });
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    _installable = true;
  });

  window.addEventListener("appinstalled", () => {
    clearDeferredPrompt();
  });
}

export function registerSW(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
