import { initialsOf } from "@/lib/profile/display-name";
import { cn } from "@/lib/utils";

/**
 * Avatar de iniciais. Decorativo: o nome sempre aparece em texto ao lado,
 * então não duplica no leitor de tela. Foto de perfil fica para AAA-217.
 */
export function UserAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-sm font-medium text-foreground",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
