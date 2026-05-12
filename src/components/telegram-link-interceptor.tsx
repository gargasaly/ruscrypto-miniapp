"use client";

import { useEffect } from "react";
import { isTelegramLink, openTelegramLinkAndClose } from "@/lib/telegramLinks";

export function TelegramLinkInterceptor() {
  useEffect(() => {
    let lastHandledHref = "";
    let lastHandledAt = 0;

    function handleTelegramLink(event: Event) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      const href = anchor?.href;

      if (!href || !isTelegramLink(href)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const now = Date.now();

      if (href === lastHandledHref && now - lastHandledAt < 600) {
        return;
      }

      lastHandledHref = href;
      lastHandledAt = now;

      if (process.env.NODE_ENV === "development") {
        console.info("[telegram-link] intercepted", href);
      }

      openTelegramLinkAndClose(href);
    }

    document.addEventListener("click", handleTelegramLink, true);
    document.addEventListener("touchend", handleTelegramLink, true);

    return () => {
      document.removeEventListener("click", handleTelegramLink, true);
      document.removeEventListener("touchend", handleTelegramLink, true);
    };
  }, []);

  return null;
}
