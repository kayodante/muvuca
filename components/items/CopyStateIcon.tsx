import { CheckIcon, type CopyIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Crossfade entre o ícone de "copiar" e o Check de confirmação: os dois
 * ficam empilhados na mesma célula (não teleporta, e o botão não muda de
 * largura) e só opacidade/blur/escala trocam. Nunca anima a partir de
 * scale(0) -- nada no mundo real aparece do nada, 0.8 é o piso
 * (`--icon-swap-start-scale`). O ícone que está saindo leva
 * pointer-events-none: o Button (não o svg) continua sendo o único alvo de
 * clique, e o aria-label dele já dá o nome acessível.
 *
 * Compartilhado por ItemCard, CodeSnippetEmbed e o spotlight/QuickLook --
 * era duplicado propositalmente antes para não acoplar cada um a ItemCard;
 * vive aqui agora porque nenhum deles precisa depender do card em si.
 */
export function CopyStateIcon({
  copied,
  Icon,
  className,
}: {
  copied: boolean;
  Icon: typeof CopyIcon;
  /** Override do tamanho padrão (`size-4`), para células menores como as do QuickLook. */
  className?: string;
}) {
  return (
    <span
      className={cn("t-icon-swap size-4", className)}
      data-state={copied ? "b" : "a"}
    >
      <Icon
        aria-hidden="true"
        data-icon="a"
        className={cn("t-icon size-4", className)}
      />
      <CheckIcon
        aria-hidden="true"
        data-icon="b"
        className={cn("t-icon size-4 text-brand-accent", className)}
      />
    </span>
  );
}
