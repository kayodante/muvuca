"use client";

import { useLocale } from "@/lib/i18n/client";
import { initialsOf } from "@/lib/profile/display-name";
import { cn } from "@/lib/utils";

/**
 * Avatar de iniciais. Decorativo: o nome sempre aparece em texto ao lado,
 * então não duplica no leitor de tela. Foto de perfil fica para AAA-217.
 * Client Component só por causa do `useLocale()` (o cálculo em si é puro);
 * os dois consumidores atuais (ProfileCard, SidebarUserMenu) já são "use
 * client", então isso não empurra nada novo para o cliente.
 */
export function UserAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const locale = useLocale();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-sm font-medium text-foreground",
        className,
      )}
    >
      {initialsOf(name, locale)}
    </span>
  );
}
