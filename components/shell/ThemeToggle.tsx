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
import type { Theme } from "@/lib/theme/preference";
import { toast } from "sonner";

const THEME_ORDER: Theme[] = ["system", "light", "dark"];

const THEME_META: Record<Theme, { label: string; icon: LucideIcon }> = {
  system: { label: "Sistema", icon: MonitorIcon },
  light: { label: "Claro", icon: SunIcon },
  dark: { label: "Escuro", icon: MoonIcon },
};

/** Theme picker. No client-side theme state: selecting an
 * option calls the `setTheme` Server Action, which revalidates the root
 * layout so the new class lands on `<html>` on the next render. */
export function ThemeToggle({ theme }: { theme: Theme }) {
  const [isPending, startTransition] = useTransition();
  const current = THEME_META[theme];
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Tema: ${current.label}`}
            pending={isPending}
          />
        }
      >
        <CurrentIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEME_ORDER.map((value) => {
          const option = THEME_META[value];
          const OptionIcon = option.icon;
          const selected = value === theme;
          return (
            <DropdownMenuItem
              key={value}
              aria-current={selected || undefined}
              onClick={() =>
                startTransition(async () => {
                  const result = await setTheme(value);
                  if (!result.ok) {
                    toast.error(result.message);
                  }
                })
              }
            >
              <OptionIcon aria-hidden="true" />
              <span className="flex-1">{option.label}</span>
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
