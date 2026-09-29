"use client";

import { useState } from "react";

import { useLocale } from "@/lib/i18n/client";
import { initialsOf } from "@/lib/profile/display-name";
import { cn } from "@/lib/utils";

/**
 * Avatar de iniciais, ou a foto de perfil no lugar delas quando há
 * `avatarHash` (ADR-017, AAA-244). Decorativo: o nome sempre aparece em
 * texto ao lado, então a imagem não duplica no leitor de tela (`alt=""`,
 * span continua `aria-hidden`). Se a foto falhar ao carregar, cai para as
 * iniciais -- nunca ícone quebrado -- e guarda qual hash falhou
 * (`failedHash`) para que um hash novo (troca de foto) tente carregar de
 * novo sem precisar de efeito. Client Component só por causa do
 * `useLocale()`/`useState()` (o cálculo das iniciais em si é puro); os dois
 * consumidores atuais (ProfileCard, SidebarUserMenu) já são "use client",
 * então isso não empurra nada novo para o cliente.
 */
export function UserAvatar({
  name,
  avatarHash,
  className,
}: {
  name: string;
  avatarHash?: string | null;
  className?: string;
}) {
  const locale = useLocale();
  const [failedHash, setFailedHash] = useState<string | null>(null);
  const showPhoto = Boolean(avatarHash) && avatarHash !== failedHash;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-sm font-medium text-foreground",
        className,
      )}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- same-origin route, already reencoded server-side (ADR-017)
        <img
          src={`/api/avatar?v=${avatarHash}`}
          alt=""
          className="size-full rounded-full object-cover"
          onError={() => setFailedHash(avatarHash ?? null)}
        />
      ) : (
        initialsOf(name, locale)
      )}
    </span>
  );
}
