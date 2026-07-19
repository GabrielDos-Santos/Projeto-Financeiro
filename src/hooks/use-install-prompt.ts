"use client";

import * as React from "react";

/** Evento não padronizado (Chromium) — sem tipo oficial no lib.dom. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari não expõe `display-mode`; usa a própria flag do WebKit.
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Fase 15 (PWA) — não existe evento `beforeinstallprompt` no Safari/iOS, e
 * uma vez instalado (`display-mode: standalone`) o prompt nunca mais
 * dispara em nenhum navegador. Os 3 estados guiam a UI de Configurações:
 * já instalado (nada a fazer), Chromium/Android (botão real) ou iOS
 * (instrução manual, único caminho possível lá).
 */
export function useInstallPrompt() {
  const [installed, setInstalled] = React.useState(false);
  const [ios, setIos] = React.useState(false);
  const deferredPrompt = React.useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = React.useState(false);

  React.useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIos());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      deferredPrompt.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    }
    function handleAppInstalled() {
      deferredPrompt.current = null;
      setCanInstall(false);
      setInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    const event = deferredPrompt.current;
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    deferredPrompt.current = null;
    setCanInstall(false);
  }, []);

  return { installed, ios, canInstall, promptInstall };
}
