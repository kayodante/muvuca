"use client";

import { useState, useTransition } from "react";
import { CheckIcon, GlobeIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocale } from "@/lib/actions/locale";
import { useDictionary } from "@/lib/i18n/client";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { toastError, toastSuccess } from "@/components/states/Toast";

/**
 * Language picker. Optimistic: the selected value updates immediately and
 * rolls back on failure, ahead of the layout re-render that `setLocale`'s
 * `revalidatePath` triggers on success. Each option is shown in its own
 * language, not the currently active one, so a user can find their
 * language even if the UI is currently in the wrong one.
 */
export function LanguageSelect({ locale }: { locale: Locale }) {
  const t = useDictionary();
  const [value, setValue] = useState(locale);
  const [isPending, startTransition] = useTransition();
  const names = t.common.localeNames;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="secondary"
            size="icon"
            aria-label={t.settings.language.ariaLabel(names[value])}
            pending={isPending}
            className="border-0 shadow-light"
          />
        }
      >
        <GlobeIcon aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((option) => {
          const selected = option === value;
          return (
            <DropdownMenuItem
              key={option}
              aria-current={selected || undefined}
              onClick={() => {
                if (option === value || isPending) return;
                const previous = value;
                setValue(option);
                startTransition(async () => {
                  const result = await setLocale(option);
                  if (!result.ok) {
                    setValue(previous);
                    toastError(result.message);
                    return;
                  }
                  toastSuccess(t.settings.language.saved);
                });
              }}
            >
              <span className="flex-1">{names[option]}</span>
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
