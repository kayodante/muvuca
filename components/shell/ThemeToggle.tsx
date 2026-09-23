"use client";

import { useTransition } from "react";
import {
  CheckIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setTheme } from "@/lib/actions/theme";
import { useDictionary } from "@/lib/i18n/client";
import type { Theme } from "@/lib/theme/preference";
import { toastError } from "@/components/states/Toast";

const THEME_ORDER: Theme[] = ["system", "light", "dark"];

const THEME_ICONS: Record<Theme, LucideIcon> = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

function ThemeStateIcon({ theme }: { theme: Theme }) {
  return (
    <span className="relative inline-block size-4">
      {THEME_ORDER.map((value) => {
        const Icon = THEME_ICONS[value];
        return (
          <span
            key={value}
            className="t-icon-swap absolute inset-0"
            data-state={theme === value ? "a" : "b"}
          >
            <Icon aria-hidden="true" data-icon="a" className="t-icon size-4" />
            <span aria-hidden="true" data-icon="b" className="t-icon" />
          </span>
        );
      })}
    </span>
  );
}

/** Theme picker. No client-side theme state: selecting an
 * option calls the `setTheme` Server Action, which revalidates the root
 * layout so the new class lands on `<html>` on the next render. */
export function ThemeToggle({ theme }: { theme: Theme }) {
  const t = useDictionary();
  const [isPending, startTransition] = useTransition();
  const labels = t.settings.appearance.themeOptions;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="secondary"
            size="icon"
            aria-label={t.settings.appearance.themeAriaLabel(labels[theme])}
            pending={isPending}
            pendingLabel={t.common.loading}
            className="border-0 shadow-light"
          />
        }
      >
        <ThemeStateIcon theme={theme} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEME_ORDER.map((value) => {
          const OptionIcon = THEME_ICONS[value];
          const selected = value === theme;
          return (
            <DropdownMenuItem
              key={value}
              aria-current={selected || undefined}
              onClick={() =>
                startTransition(async () => {
                  const result = await setTheme(value);
                  if (!result.ok) {
                    toastError(result.message);
                  }
                })
              }
            >
              <OptionIcon aria-hidden="true" />
              <span className="flex-1">{labels[value]}</span>
              {selected && (
                <CheckIcon aria-hidden="true" className="text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
