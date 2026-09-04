"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
// Sonner injects this stylesheet as a runtime `<style>` element, which the
// production CSP blocks (`style-src` is nonce-only and the injection carries
// none) -- toasts shipped completely unstyled. Importing it here makes Next
// emit it as a real stylesheet served from 'self'.
import "sonner/dist/styles.css";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

/**
 * No `next-themes`: theme here is "system" unconditionally. Sonner resolves
 * that via its own CSS (`prefers-color-scheme`), not JS/localStorage, and
 * the actual colors always come from our CSS variables below regardless --
 * consistent with the account-based theme system and the no-inline-script
 * CSP.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        // Spinner acelerado (600ms); sob prefers-reduced-motion desacelera em vez de remover.
        loading: (
          <Loader2Icon className="size-4 animate-spin [animation-duration:600ms] motion-reduce:[animation-duration:1200ms]" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
