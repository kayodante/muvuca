"use client";

import type { ReactNode } from "react";
import { type CopyIcon, InfoIcon, MoreHorizontalIcon } from "lucide-react";
import type { LibraryItemSummary } from "@/lib/database/queries/items";
import type { Tag } from "@/lib/database/queries/tags";
import { getTagHref } from "@/lib/tags/routes";
import { copyToClipboard } from "@/lib/clipboard";
import { MORPH_CLASS, MORPH_TITLE_CLASS } from "@/lib/motion/view-transition";
import { useDictionary } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { TagChip } from "@/components/tags/TagChip";
import { Button } from "@/components/ui/button";
import { MatrixLoader } from "@/components/ui/matrix-loader";
import { announce } from "@/components/states/Announcer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toastError } from "@/components/states/Toast";
import { useTransientFlag } from "./useTransientFlag";
import { typeMetaFor } from "./typeMeta";
import { CopyStateIcon } from "./CopyStateIcon";

/**
 * Shared by every quick action: only the badge stays visible at rest.
 * Gate é capacidade de ponteiro (`hover: hover` + `pointer: fine`), não
 * breakpoint -- `sm:` tratava largura como proxy de "tem mouse", mas um
 * iPad é >= 640px e touch. Em touch as ações ficam sempre visíveis; o
 * esconder-em-repouso só se aplica a quem realmente pode passar o mouse.
 *
 * Pressed (`scale-[0.97]`, parado em quem abre popup), duração, easing e
 * reduced motion vêm do Button. Aqui só entra `opacity` na lista de
 * transição -- que precisa repetir as do Button, porque twMerge substitui
 * a lista inteira.
 */
export const ACTION_CLASS =
  "opacity-100 transition-[opacity,background-color,color,scale] [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100";

/**
 * Figma hover (item-link/-code/-prompt, State=Hover): the tag chips (Tag,
 * State=Hover) gain `light-2` as a second fill; the card itself gets the
 * fainter `light-4`. (The preview panel swaps its base color instead -- see
 * PREVIEW_HOVER in ItemCardStoredContent.) An
 * inset shadow is how CSS stacks a translucent fill over a background and
 * under the content -- and, unlike a background-image, it transitions. At
 * rest it is the same shadow in `transparent`, so the two interpolate
 * instead of snapping. The article gets the same trio with `hover:` and
 * `light-4` (it is the group, not inside it).
 */
const HOVER_LIGHT =
  "inset-shadow-[0_0_0_999px] inset-shadow-transparent group-hover:inset-shadow-light-2";

export type ItemCardBaseProps = {
  itemTags: Tag[];
  morphing: boolean;
  isPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function ItemCardFrame({
  morphing,
  isPending,
  children,
}: {
  morphing: boolean;
  isPending: boolean;
  children: ReactNode;
}) {
  return (
    // Figma 52:3269 puts the light edge on the card, over its content. An
    // inset box-shadow paints with the article's own background, *under*
    // its children, so the opaque thumbnail hid it and only the text area
    // showed it. The article keeps the outer ring; the inset light lives on
    // an ::after above everything (pointer-events-none, so clicks pass).
    // Under that light it adds a 1px ring in the card's own color: the edge
    // is 6% white, which vanishes over a white thumbnail and made the image
    // look 1px wider than the card. Over the text area it changes nothing.
    // Hover (Figma 251:1906) swaps that edge for effect "Light-2" and lays
    // `light-4` over the surface; no lift -- the thumbnail zoom and the
    // actions fading in carry the motion. Entry uses --motion-slow; exit
    // uses --motion-base so adjacent cards settle quickly while scanning.
    <article
      aria-busy={isPending || undefined}
      className={cn(
        "group relative flex min-h-56 flex-col overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--color-shadow-1)] inset-shadow-[0_0_0_999px] inset-shadow-transparent transition-[box-shadow,opacity] duration-(--motion-base) ease-out-muvuca after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-[inherit] after:shadow-[var(--shadow-light),inset_0_0_0_1px_var(--card)] after:transition-shadow after:duration-(--motion-base) after:ease-out-muvuca after:content-[''] hover:inset-shadow-light-4 hover:duration-(--motion-slow) hover:after:shadow-[var(--shadow-light-2),inset_0_0_0_1px_var(--card)] hover:after:duration-(--motion-slow) motion-reduce:transition-none motion-reduce:after:transition-none",
        morphing && MORPH_CLASS,
        // Brief reads should reach the morph before any pending visual appears.
        isPending && "pointer-events-none opacity-75 [transition-delay:150ms]",
      )}
    >
      {children}
    </article>
  );
}

export function ItemTypeBadge({
  type,
  isPending,
}: {
  type: LibraryItemSummary["type"];
  isPending: boolean;
}) {
  const t = useDictionary();
  const typeMeta = typeMetaFor(t)[type];

  return (
    <div className="flex min-w-0 items-center gap-2">
      <typeMeta.Icon
        aria-hidden="true"
        className={cn("size-3", typeMeta.hue)}
      />
      {/* Concatenação literal, não `cn()`: twMerge trata qualquer par
          `text-*` como o mesmo grupo "cor de texto" e descartaria
          text-brand-pixel (fonte) em favor de typeMeta.hue (cor). */}
      <span className={`text-brand-pixel ${typeMeta.hue}`}>
        {typeMeta.label}
      </span>
      {isPending && (
        <MatrixLoader
          variant="pulse"
          rounded
          className="size-3 transition-opacity [transition-delay:150ms] duration-(--motion-base) ease-out-muvuca motion-reduce:duration-0 starting:opacity-0"
          aria-label={t.items.card.loadingItem}
        />
      )}
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={typeMeta.hint}
              // O ícone continua 10x10 (size-2.5, decisão de design fechada),
              // mas o alvo de toque real era a própria caixa do botão --
              // menor alvo interativo do produto. `after:-inset-[7px]` estica
              // a área clicável para 24x24 sem tocar no layout: um
              // pseudo-elemento absoluto sai do fluxo, então o `gap-2` da
              // linha do badge não muda. O anel de foco fica no botão em si
              // (10x10), não no pseudo-elemento -- o anel acompanha o ícone,
              // a área de toque invisível é só clicável.
              className="pointer-events-auto relative rounded-full text-muted-foreground transition-[color,scale] duration-(--motion-fast) ease-out-muvuca outline-none after:absolute after:-inset-[7px] after:content-[''] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
            />
          }
        >
          <InfoIcon aria-hidden="true" className="size-2.5" />
        </TooltipTrigger>
        <TooltipContent>{typeMeta.hint}</TooltipContent>
      </Tooltip>
    </div>
  );
}

// Kept in one place so the media layout (header floating over the
// thumbnail) and the plain layout (header in the card body) can't drift.
export function ItemCardActions({
  title,
  onEdit,
  onDelete,
  onRefreshPreview,
  children,
}: {
  title: string;
  onEdit: () => void;
  onDelete: () => void;
  onRefreshPreview?: () => void;
  children?: ReactNode;
}) {
  const t = useDictionary();

  return (
    <div className="pointer-events-auto flex shrink-0 items-center gap-1">
      {children}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" className={ACTION_CLASS} />
          }
        >
          <MoreHorizontalIcon aria-hidden="true" />
          <span className="sr-only">{t.items.card.itemActions(title)}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onRefreshPreview && (
            <>
              <DropdownMenuItem onClick={onRefreshPreview}>
                {t.items.card.refreshPreview}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={onEdit}>{t.common.edit}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            {t.common.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function CopyLinkAction({
  href,
  Icon,
}: {
  href: string;
  Icon: typeof CopyIcon;
}) {
  const t = useDictionary();
  const [copiedLink, triggerCopiedLink] = useTransientFlag(1500);

  async function handleCopyLink() {
    const success = await copyToClipboard(href);
    if (success) {
      triggerCopiedLink();
      announce(t.items.card.linkCopied);
    } else {
      toastError(t.items.card.linkCopyFailed);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.items.card.copyLink}
            onClick={handleCopyLink}
            className={ACTION_CLASS}
          />
        }
      >
        <CopyStateIcon copied={copiedLink} Icon={Icon} />
      </TooltipTrigger>
      <TooltipContent>
        {copiedLink ? t.items.card.copied : t.items.card.copyLink}
      </TooltipContent>
    </Tooltip>
  );
}

export function ItemCardHeading({
  title,
  description,
  morphing,
  descriptionClamp,
}: {
  title: string;
  description: string | null;
  morphing: boolean;
  descriptionClamp: "line-clamp-1" | "line-clamp-2";
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2
        dir="auto"
        className={cn(
          "text-headline-sm line-clamp-2 [overflow-wrap:anywhere]",
          morphing && MORPH_TITLE_CLASS,
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          dir="auto"
          className={cn(
            "text-body-sm [overflow-wrap:anywhere] text-muted-foreground",
            descriptionClamp,
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

export function ItemCardPlainLayout({
  badge,
  actions,
  children,
}: {
  badge: ReactNode;
  actions: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2.5">
        {badge}
        {actions}
      </div>
      {children}
    </div>
  );
}

export function ItemTags({ tags }: { tags: Tag[] }) {
  const t = useDictionary();

  if (tags.length === 0) return null;

  // Tags além das 3 exibidas: o "+N" era mudo -- dizia que havia mais e não
  // dizia quais, nem para leitor de tela. Não vira tab stop (48 itens por
  // página seriam 48 paradas de Tab por um dado secundário) nem Tooltip do
  // Base UI (exige trigger focável); o número visível é `aria-hidden`, um
  // irmão `sr-only` nomeia as tags restantes, e `title` cobre quem usa
  // ponteiro sem focar.
  const hiddenTags = tags.slice(3);
  const hiddenTagsLabel =
    hiddenTags.length > 0
      ? t.items.card.hiddenTagsLabel(
          hiddenTags.length,
          hiddenTags.map((tag) => tag.name).join(", "),
        )
      : null;

  return (
    <div className="mt-auto flex flex-wrap gap-1.5">
      {tags.slice(0, 3).map((tag) => (
        <TagChip
          key={tag.id}
          name={tag.name}
          colorToken={tag.colorToken}
          href={getTagHref(tag)}
          className={HOVER_LIGHT}
        />
      ))}
      {hiddenTagsLabel && (
        <span
          className="text-metadata self-center text-muted-foreground"
          title={hiddenTagsLabel}
        >
          <span aria-hidden="true">+{hiddenTags.length}</span>
          <span className="sr-only">{hiddenTagsLabel}</span>
        </span>
      )}
    </div>
  );
}
