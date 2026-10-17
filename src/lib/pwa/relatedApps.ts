import { PRODUCTION_ORIGIN } from "@/lib/multiplayer/share";

export type RelatedApp = {
  platform?: string;
  url?: string;
  id?: string;
};

export const WEB_APP_MANIFEST_URL = `${PRODUCTION_ORIGIN}/manifest.webmanifest`;

/** True only when Chrome reports this site's installed WebAPK / related web app. */
export function relatedPwaIsInstalled(
  apps: readonly RelatedApp[],
  manifestUrl = WEB_APP_MANIFEST_URL,
): boolean {
  let manifestOrigin = "";
  try {
    manifestOrigin = new URL(manifestUrl).origin;
  } catch {
    return false;
  }
  return apps.some((app) => {
    if (app.platform !== "webapp") return false;
    if (!app.url) return true;
    return app.url === manifestUrl || app.url.startsWith(`${manifestOrigin}/`);
  });
}

export async function queryRelatedPwaInstalled(): Promise<boolean> {
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
  };
  if (typeof nav.getInstalledRelatedApps !== "function") return false;
  try {
    return relatedPwaIsInstalled(await nav.getInstalledRelatedApps());
  } catch {
    return false;
  }
}
