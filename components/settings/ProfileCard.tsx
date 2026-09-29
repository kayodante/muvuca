"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { removeAvatar, setAvatar, setDisplayName } from "@/lib/actions/profile";
import { useDictionary } from "@/lib/i18n/client";
import { translateIssue } from "@/lib/i18n/validation";
import { displayNameSchema } from "@/lib/profile/display-name";
import { toAvatarUpload } from "@/lib/profile/avatar-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shell/UserAvatar";
import { toastSuccess } from "@/components/states/Toast";

/**
 * "Como quer ser chamado" + foto de perfil (ADR-017, AAA-244). A foto tem
 * sua própria transição/erro, separados dos do nome, e nenhum botão de foto
 * é `type="submit"`: o único `<form>` do card é o do nome, então escolher
 * ou remover uma foto nunca dispara o submit dele. Vazio = iniciais.
 */
export function ProfileCard({
  displayName,
  fallbackName,
  avatarHash,
}: {
  displayName: string | null;
  fallbackName: string;
  avatarHash?: string | null;
}) {
  const t = useDictionary();
  const [value, setValue] = useState(displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoAction, setPhotoAction] = useState<"upload" | "remove" | null>(
    null,
  );
  const [isPhotoPending, startPhotoTransition] = useTransition();
  const photoHintId = useId();
  const photoErrorId = useId();
  const uploadPending = isPhotoPending && photoAction === "upload";
  const removePending = isPhotoPending && photoAction === "remove";
  const photoDescribedBy = photoError
    ? `${photoHintId} ${photoErrorId}`
    : photoHintId;

  // O botão focado fica desabilitado durante a transição e o browser manda o
  // foco para o body; "Remover" ainda some junto com a foto. Ao terminar,
  // devolve o foco ao botão de foto -- só se ele se perdeu, para não roubar
  // o foco de quem já foi para outro campo.
  useEffect(() => {
    if (isPhotoPending || photoAction === null) return;
    if (document.activeElement === document.body) {
      uploadButtonRef.current?.focus();
    }
  }, [isPhotoPending, photoAction]);

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

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Zera o value para que escolher o mesmo arquivo de novo dispare `change`.
    event.target.value = "";
    if (!file) return;

    setPhotoError(null);
    setPhotoAction("upload");
    // A decodificação no browser fica dentro da transição: foto grande leva
    // um instante para decodificar, e o botão já precisa estar em pendência.
    startPhotoTransition(async () => {
      let blob: Blob;
      try {
        blob = await toAvatarUpload(file);
      } catch {
        // Formato que o browser não decodifica (ex.: HEIC no Chrome desktop):
        // erro de formato antes de qualquer request ao servidor.
        setPhotoError(t.validation.avatarUnsupportedFormat);
        return;
      }

      const form = new FormData();
      form.append("avatar", blob, "avatar");
      const result = await setAvatar(form);
      if (!result.ok) {
        // Foto anterior continua: a prop `avatarHash` não muda.
        setPhotoError(result.message);
        return;
      }
      toastSuccess(t.settings.profile.photo.updated);
    });
  }

  function handleRemovePhoto() {
    setPhotoError(null);
    setPhotoAction("remove");
    startPhotoTransition(async () => {
      const result = await removeAvatar();
      if (!result.ok) {
        setPhotoError(result.message);
        return;
      }
      toastSuccess(t.settings.profile.photo.removed);
    });
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <UserAvatar
          name={value.trim() || fallbackName}
          avatarHash={avatarHash}
          className="size-16 text-lg"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            {/* Fora da árvore de acessibilidade (hidden): o nome acessível
                mora no botão que o aciona, não aqui, então não leva <label>. */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              hidden
              onChange={handleFileChange}
            />
            <Button
              ref={uploadButtonRef}
              type="button"
              variant="outline"
              pending={uploadPending}
              pendingLabel={t.settings.profile.photo.uploading}
              disabled={isPhotoPending}
              aria-describedby={photoDescribedBy}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarHash
                ? t.settings.profile.photo.change
                : t.settings.profile.photo.upload}
            </Button>
            {avatarHash && (
              <Button
                type="button"
                variant="ghost"
                pending={removePending}
                pendingLabel={t.settings.profile.photo.removing}
                disabled={isPhotoPending}
                aria-describedby={photoDescribedBy}
                onClick={handleRemovePhoto}
              >
                {t.settings.profile.photo.remove}
              </Button>
            )}
          </div>
          <p id={photoHintId} className="text-body-sm text-muted-foreground">
            {t.settings.profile.photo.hint}
          </p>
          {photoError && (
            <p
              id={photoErrorId}
              role="alert"
              className="text-sm text-destructive"
            >
              {photoError}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="space-y-1.5">
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
          className="self-start"
          pending={isPending}
          pendingLabel={t.settings.profile.saving}
          disabled={unchanged}
        >
          {t.settings.profile.save}
        </Button>
      </form>
    </div>
  );
}
