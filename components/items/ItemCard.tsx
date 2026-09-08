"use client";

import { useState } from "react";
import {
  CheckIcon,
  CodeXmlIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
  InfoIcon,
  LinkIcon,
  MaximizeIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { LibraryItemSummary } from "@/lib/database/queries/items";
import type { Tag } from "@/lib/database/queries/tags";
import { copyToClipboard } from "@/lib/clipboard";
import { normalizeHttpUrl } from "@/lib/validation/item";
import { MORPH_CLASS, MORPH_TITLE_CLASS } from "@/lib/motion/view-transition";
import { cn } from "@/lib/utils";
import { TagChip } from "@/components/tags/TagChip";
import { Button } from "@/components/ui/button";
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
import { LinkPreviewMedia, previewImageSrc } from "./LinkPreviewMedia";
import { SiteIdentity } from "./SiteIdentity";

/**
 * Type badge (Figma "Meta"): lowercase Geist Pixel label in the type's own
 * hue, always visible. The colors are theme-aware tokens (`--type-*`), not
 * the raw tag palette -- emerald/orange at their mockup shade reprove AA on
 * the light surface at this size, and the mockup is dark-only.
 *
 * `hint` is the accessible name of the trailing info button and the text of
 * its tooltip: the pixel face plus a 3-letter word is a weak label on its
 * own, so the type is also available as plain prose to anyone hovering,
 * focusing, or using a screen reader.
 */
const TYPE_META = {
  link: {
    label: "link",
    hue: "text-type-link",
    Icon: LinkIcon,
    hint: "Um conteúdo salvo da web para acessar depois.",
  },
  prompt: {
    label: "prompt",
    hue: "text-type-prompt",
    Icon: FileTextIcon,
    hint: "Um prompt salvo para usar novamente com IA.",
  },
  code_component: {
    label: "code",
    hue: "text-type-code",
    Icon: CodeXmlIcon,
    hint: "Um código ou snippet para consultar e reutilizar.",
  },
} as const;

/**
 * Shared by every quick action: only the badge stays visible at rest.
 * Gate é capacidade de ponteiro (`hover: hover` + `pointer: fine`), não
 * breakpoint -- `sm:` tratava largura como proxy de "tem mouse", mas um
 * iPad é >= 640px e touch. Em touch as ações ficam sempre visíveis; o
 * esconder-em-repouso só se aplica a quem realmente pode passar o mouse.
 */
const ACTION_CLASS =
  "opacity-100 transition-opacity duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100";

/**
 * Crossfade entre o ícone de "copiar" e o Check de confirmação: os dois
 * ficam empilhados na mesma célula (não teleporta, e o botão não muda de
 * largura) e só opacidade/escala trocam. Nunca anima a partir de scale(0)
 * -- nada no mundo real aparece do nada, 0.8 é o piso. O ícone que está
 * saindo leva pointer-events-none: o Button (não o svg) continua sendo o
 * único alvo de clique, e o aria-label dele já dá o nome acessível.
 */
function CopyStateIcon({
  copied,
  Icon,
}: {
  copied: boolean;
  Icon: typeof CopyIcon;
}) {
  return (
    <span className="t-icon-swap size-4" data-state={copied ? "b" : "a"}>
      <Icon aria-hidden="true" data-icon="a" className="t-icon size-4" />
      <CheckIcon
        aria-hidden="true"
        data-icon="b"
        className="t-icon size-4 text-brand-accent"
      />
    </span>
  );
}

export function ItemCard({
  item,
  tags,
  morphing,
  isPending = false,
  onEdit,
  onDelete,
  onView,
  onRefreshPreview,
}: {
  item: LibraryItemSummary;
  tags: Tag[];
  /** This card is the origin (or destination) of the open prompt or code dialog. */
  morphing: boolean;
  isPending?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  /**
   * Injected instead of ItemCard calling the `refreshItemPreview` server
   * action itself: this is a presentational component, and a direct import
   * of a "use server" action here drags its whole server-only dependency
   * graph (enrich -> ssrf -> node:net) into any bundler that doesn't apply
   * Next's RSC transform. The real implementation lives one level up, in
   * ItemsPage.
   */
  onRefreshPreview: () => void;
}) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const associatedTags = item.tagIds.flatMap((tagId) => {
    const tag = tags.find((candidate) => candidate.id === tagId);
    return tag ? [tag] : [];
  });
  const safeHref = item.url ? normalizeHttpUrl(item.url) : null;
  const domain = safeHref ? new URL(safeHref).hostname : null;
  // The user's own description always wins; the enrichment pipeline's
  // remote_description only fills a gap the user left empty, never
  // overrides authored text.
  const displayDescription =
    item.type === "link"
      ? (item.description ?? item.preview?.remoteDescription ?? null)
      : item.description;
  const faviconSrc =
    item.type === "link" && item.preview?.faviconHash
      ? previewImageSrc(item.id, "icon", item.preview.faviconHash)
      : null;
  // A link with a usable URL gets the media layout: the header (type badge
  // + quick actions) floats over the thumbnail instead of sitting in the
  // card body, so the whole card below it can be one anchor.
  const clickableMedia = item.type === "link" && Boolean(safeHref);
  const typeMeta = TYPE_META[item.type];

  async function handleCopyPrompt() {
    if (item.type !== "prompt") return;
    const success = await copyToClipboard(item.contentPreview);
    if (success) {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1500);
      toast.success("Prompt copiado para a área de transferência.");
    } else {
      toast.error("Não foi possível copiar o prompt.");
    }
  }

  async function handleCopyCode() {
    if (item.type !== "code_component") return;
    const success = await copyToClipboard(item.contentPreview);
    if (success) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1500);
      toast.success("Código copiado para a área de transferência.");
    } else {
      toast.error("Não foi possível copiar o código.");
    }
  }

  async function handleCopyLink() {
    if (!safeHref) return;
    const success = await copyToClipboard(safeHref);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
      toast.success("Link copiado para a área de transferência.");
    } else {
      toast.error("Não foi possível copiar o link.");
    }
  }

  const typeBadge = (
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
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={typeMeta.hint}
              className="pointer-events-auto rounded-full text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            />
          }
        >
          <InfoIcon aria-hidden="true" className="size-2.5" />
        </TooltipTrigger>
        <TooltipContent>{typeMeta.hint}</TooltipContent>
      </Tooltip>
    </div>
  );

  // Kept in one place so the media layout (header floating over the
  // thumbnail) and the plain layout (header in the card body) can't drift.
  const actions = (
    <div className="pointer-events-auto flex shrink-0 items-center gap-1">
      {clickableMedia && safeHref ? (
        // Redundant with the card-wide anchor by design (Figma): the
        // card's own click target is invisible, so this icon is what makes
        // "opens the site" discoverable. A real <a>, not a button, so
        // middle-click and "open in new tab" behave normally.
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                nativeButton={false}
                aria-label="Abrir link em nova aba"
                className={ACTION_CLASS}
                render={
                  <a
                    href={safeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              />
            }
          >
            <ExternalLinkIcon aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Abrir link</TooltipContent>
        </Tooltip>
      ) : item.type === "prompt" || item.type === "code_component" ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={
                  item.type === "prompt"
                    ? "Ver conteúdo completo"
                    : "Ver código completo"
                }
                onClick={onView}
                className={ACTION_CLASS}
              />
            }
          >
            <MaximizeIcon aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>
            {item.type === "prompt"
              ? "Ver conteúdo completo"
              : "Ver código completo"}
          </TooltipContent>
        </Tooltip>
      ) : null}
      {item.type === "prompt" && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Copiar prompt"
                onClick={handleCopyPrompt}
                className={ACTION_CLASS}
              />
            }
          >
            <CopyStateIcon copied={copiedPrompt} Icon={CopyIcon} />
          </TooltipTrigger>
          <TooltipContent>
            {copiedPrompt ? "Copiado!" : "Copiar prompt"}
          </TooltipContent>
        </Tooltip>
      )}
      {item.type === "code_component" && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Copiar código"
                onClick={handleCopyCode}
                className={ACTION_CLASS}
              />
            }
          >
            <CopyStateIcon copied={copiedCode} Icon={CopyIcon} />
          </TooltipTrigger>
          <TooltipContent>
            {copiedCode ? "Copiado!" : "Copiar código"}
          </TooltipContent>
        </Tooltip>
      )}
      {((item.type === "link" && safeHref) ||
        (item.type === "code_component" && safeHref)) && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Copiar link"
                onClick={handleCopyLink}
                className={ACTION_CLASS}
              />
            }
          >
            <CopyStateIcon
              copied={copiedLink}
              Icon={item.type === "code_component" ? LinkIcon : CopyIcon}
            />
          </TooltipTrigger>
          <TooltipContent>
            {copiedLink ? "Copiado!" : "Copiar link"}
          </TooltipContent>
        </Tooltip>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" className={ACTION_CLASS} />
          }
        >
          <MoreHorizontalIcon aria-hidden="true" />
          <span className="sr-only">Ações de {item.title}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {item.type === "link" && (
            <>
              <DropdownMenuItem onClick={onRefreshPreview}>
                Atualizar prévia
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Favicon/monogram + hostname (Figma: the row under the media). A link
  // whose URL didn't survive `normalizeHttpUrl` has no media layout to sit
  // in, so this row is also where "Link inválido" is reported -- the card
  // must still say why it can't be opened.
  const siteRow = item.type === "link" && (
    <div className="flex min-w-0 items-center gap-2">
      {domain ? (
        <SiteIdentity domain={domain} faviconSrc={faviconSrc} />
      ) : (
        <LinkIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      )}
      <span className="text-metadata min-w-0 flex-1 truncate text-muted-foreground">
        {domain ?? "Link inválido"}
      </span>
    </div>
  );

  const content = (
    <div className="flex flex-col gap-1">
      <h2
        dir="auto"
        className={cn(
          "text-headline-sm line-clamp-2 [overflow-wrap:anywhere]",
          morphing && MORPH_TITLE_CLASS,
        )}
      >
        {item.title}
      </h2>
      {displayDescription && (
        <p
          dir="auto"
          className={cn(
            "text-body-sm [overflow-wrap:anywhere] text-muted-foreground",
            item.type === "link" ? "line-clamp-2" : "line-clamp-1",
          )}
        >
          {displayDescription}
        </p>
      )}
    </div>
  );

  // Prompt/code preview is a filled panel now, not a rule-separated
  // paragraph: at the same size and color as the description it used to
  // read as one continuous block, and the panel says "this is the stored
  // content" without spending a second type size on it.
  //
  // The panel hugs its content instead of stretching (`flex-1` removed):
  // the height cap already comes from `line-clamp-6` on the <p> +
  // overflow-hidden, so `flex-1` had no job left except soaking up the
  // grid row's `align-items: stretch` leftover as blank padding -- measured
  // at 161.8px of panel for a single ~20px line of text. Whatever leftover
  // the row still has now falls through to `tagsBlock`'s `mt-auto`, which
  // anchors tags to the card's bottom edge; with no tags it just sits at
  // the card's own bottom, same as the link layout.
  const previewPanel = (item.type === "prompt" ||
    item.type === "code_component") && (
    <div className="overflow-hidden rounded-md bg-secondary p-3">
      <p
        dir="auto"
        className={cn(
          "text-body-sm line-clamp-6 [overflow-wrap:anywhere] whitespace-pre-line text-muted-foreground",
          item.type === "code_component" && "font-mono",
        )}
      >
        {item.contentPreview}
      </p>
    </div>
  );

  const tagsBlock = associatedTags.length > 0 && (
    <div className="mt-auto flex flex-wrap gap-1.5">
      {associatedTags.slice(0, 3).map((tag) => (
        <TagChip
          key={tag.id}
          name={tag.name}
          colorToken={tag.colorToken}
          href={`/tags/${tag.id}`}
        />
      ))}
      {associatedTags.length > 3 && (
        <span className="text-metadata self-center text-muted-foreground">
          +{associatedTags.length - 3}
        </span>
      )}
    </div>
  );

  return (
    <article
      aria-busy={isPending || undefined}
      className={cn(
        "group relative flex min-h-56 flex-col overflow-hidden rounded-xl border border-border bg-card transition-[background-color,border-color,transform,opacity] duration-(--motion-fast) ease-out-muvuca hover:border-foreground/20 hover:bg-secondary/30 motion-safe:hover:-translate-y-px motion-reduce:transition-none",
        morphing && MORPH_CLASS,
        isPending && "pointer-events-none opacity-75",
      )}
    >
      {clickableMedia && domain && safeHref ? (
        <>
          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 flex-col rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <div className="relative">
              <LinkPreviewMedia
                itemId={item.id}
                domain={domain}
                preview={item.preview}
              />
              {/* Scrim, not decoration: the badge and the action icons sit
                on whatever the thumbnail happens to show there, and without
                it their contrast is whatever the remote page decided. Fixed
                height, not inset-0: the header (badge top 16.8px/13px tall,
                action buttons top 16.8px/32px tall, base at 48.8px) needs
                protection only up to ~49px, so the scrim is 96px tall,
                opaque until 40% (~38px, clearing the header with margin)
                and fading to transparent by 96px — leaving the rest of the
                preview uncovered instead of veiling the whole thumbnail. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-card from-40% to-transparent"
              />
            </div>
            <div className="flex flex-1 flex-col gap-4 p-4">
              {siteRow}
              {content}
            </div>
          </a>
          {/* The header floats over the media instead of nesting inside the
            anchor: a <button> inside an <a> is invalid HTML and would add a
            second tab stop. It comes *after* the anchor in DOM order so Tab
            still reaches the card's own link first, and
            `pointer-events-none` on the wrapper hands the clicks it covers
            back to that anchor underneath; the actions themselves opt back
            in. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2.5 p-4 pb-2">
            {typeBadge}
            {actions}
          </div>
          {tagsBlock && <div className="flex px-4 pb-4">{tagsBlock}</div>}
        </>
      ) : (
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-start justify-between gap-2.5">
            {typeBadge}
            {actions}
          </div>
          {siteRow}
          {item.type === "prompt" || item.type === "code_component" ? (
            // The preview panel used to sit outside this button, so the
            // biggest region of the card (168px measured) had no click
            // target at all -- elementFromPoint() on it hit the bare <p>,
            // no <a>/<button> ancestor. Folding previewPanel into the same
            // button as `content` fixes that without adding a tab stop: it
            // is still the one control the title/MaximizeIcon already
            // pointed at (`onView`), just grown to cover the content that
            // sits above it. `gap-6` (24px), not the surrounding `gap-4`,
            // reproduces the exact description-to-panel gap the first pass
            // set up (16px bottom padding + 8px top padding on the two
            // containers that used to split here). `ring-inset` instead of
            // the small button's `ring-offset-2`: at this footprint an
            // offset ring would sit flush against the card's own edges,
            // reading as a second border rather than focus -- the media
            // card's full-body anchor already uses inset for the same
            // reason.
            <button
              type="button"
              onClick={onView}
              className="flex flex-col gap-6 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              {content}
              {previewPanel}
            </button>
          ) : (
            content
          )}
          {tagsBlock}
        </div>
      )}
    </article>
  );
}
