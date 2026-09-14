/**
 * PWA install detection and platform helpers.
 */

export type InstallPlatform = "ios" | "android" | "desktop" | "unknown";

/** Whether the app is running as an installed PWA (standalone). */
export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;

  const nav = window.navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

/** Detect mobile platform for install instructions. */
export function getInstallPlatform(): InstallPlatform {
  if (typeof window === "undefined") return "unknown";

  const ua = window.navigator.userAgent;

  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Windows|Macintosh|Linux/.test(ua)) return "desktop";

  return "unknown";
}

/** iOS Safari — no beforeinstallprompt; manual Add to Home Screen only. */
export function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari =
    /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

  return isIos && isSafari;
}

/** Chromium browsers that support the native install prompt. */
export function supportsNativeInstallPrompt(): boolean {
  if (typeof window === "undefined") return false;
  return !isIosSafari();
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/** Type guard for the deferred install prompt event. */
export function isBeforeInstallPromptEvent(
  event: Event
): event is BeforeInstallPromptEvent {
  return "prompt" in event && typeof (event as BeforeInstallPromptEvent).prompt === "function";
}
