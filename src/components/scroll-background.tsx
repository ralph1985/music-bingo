"use client";

import { useEffect } from "react";

const SCROLL_FACTOR = 0.08;
const MAX_BACKGROUND_SHIFT = 160;

export function getBackgroundShift(scrollY: number): number {
  return Math.min(Math.max(scrollY, 0) * SCROLL_FACTOR, MAX_BACKGROUND_SHIFT);
}

export default function ScrollBackground() {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      frame = 0;
      root.style.setProperty("--background-shift", reducedMotion.matches ? "0px" : `${getBackgroundShift(window.scrollY)}px`);
    };

    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    reducedMotion.addEventListener("change", update);

    return () => {
      window.removeEventListener("scroll", onScroll);
      reducedMotion.removeEventListener("change", update);
      if (frame !== 0) window.cancelAnimationFrame(frame);
      root.style.removeProperty("--background-shift");
    };
  }, []);

  return null;
}
