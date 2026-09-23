"use client";

import { useId, useState, useTransition, type FormEvent } from "react";

import { setDisplayName } from "@/lib/actions/profile";
import { useDictionary } from "@/lib/i18n/client";
import { translateIssue } from "@/lib/i18n/validation";
import { displayNameSchema } from "@/lib/profile/display-name";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shell/UserAvatar";
import { toastSuccess } from "@/components/states/Toast";

/**
 * "Como quer ser chamado". Vazio limpa o nome e a UI volta a usar
 * `fallbackName` (nome do provedor ou parte local do email).
 */
export function ProfileCard({
  displayName,
  fallbackName,
}: {
  displayName: string | null;
  fallbackName: string;
}) {
  const t = useDictionary();
  const [value, setValue] = useState(displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  const unchanged = value.trim() === (displayName ?? "");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || unchanged) return;

    const parsed = displayNameSchema.safeParse(value);
    if (!parsed.success) {
      setError(translateIssue(parsed.error.issues[0]?.message ?? "", t));
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await setDisplayName(value);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setValue(result.data ?? "");
      toastSuccess(
        result.data ? t.settings.profile.saved : t.settings.profile.removed,
      );
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-center gap-3">
        <UserAvatar
          name={value.trim() || fallbackName}
          className="size-12 text-base"
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor={inputId} className="text-label-md">
            {t.settings.profile.nameLabel}
          </label>
          <Input
            id={inputId}
            dir="auto"
            autoComplete="nickname"
            placeholder={fallbackName}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            disabled={isPending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          />
        </div>
      </div>

      <p id={hintId} className="text-body-sm text-muted-foreground">
        {t.settings.profile.hint} <span dir="auto">{fallbackName}</span>.
      </p>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="sm"
        className="self-start"
        pending={isPending}
        pendingLabel={t.settings.profile.saving}
        disabled={unchanged}
      >
        {t.settings.profile.save}
      </Button>
    </form>
  );
}
