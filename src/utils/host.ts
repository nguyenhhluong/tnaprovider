export function isAppHost(hostname = window.location.hostname) {
  return hostname === "app.tnaprovider.com.au" || hostname.startsWith("app.");
}

export function getAppBaseUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.protocol}//app.tnaprovider.com.au`;
}

export function stripPlatformPrefix(pathname: string) {
  if (pathname === "/platform") return "/";
  if (pathname.startsWith("/platform/")) {
    return pathname.replace(/^\/platform/, "") || "/";
  }
  return pathname;
}

export function appPath(path: string) {
  const clean = path.replace(/^\/platform/, "") || "/";
  return isAppHost() ? clean : `/platform${clean === "/" ? "" : clean}`;
}

export function isMainHost(hostname = window.location.hostname) {
  return hostname === "tnaprovider.com.au" || hostname === "www.tnaprovider.com.au" || (!isAppHost(hostname) && !hostname.startsWith("localhost") && !hostname.startsWith("127."));
}
