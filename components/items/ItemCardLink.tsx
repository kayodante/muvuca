"use client";

import { CopyIcon, ExternalLinkIcon, LinkIcon } from "lucide-react";
import type { LibraryItemSummary } from "@/lib/database/queries/items";
import { normalizeHttpUrl } from "@/lib/validation/item";
import { useDictionary } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LinkPreviewMedia, previewImageSrc } from "./LinkPreviewMedia";
import { SiteIdentity } from "./SiteIdentity";
import {
  ACTION_CLASS,
  CopyLinkAction,
  ItemCardActions,
  ItemCardFrame,
  ItemCardHeading,
  ItemCardPlainLayout,
  ItemTags,
  ItemTypeBadge,
  type ItemCardBaseProps,
} from "./ItemCardChrome";

/**
 * Glass pill behind the header over a link thumbnail (see its use). Hairline
 * border and badge padding are TagChip's (Figma "Tag" 253:2637), so the pills
 * over the image and the chips under the text read as one family; 4px
 * taller than the chip, so the icon buttons fit with even padding.
 */
const MEDIA_PILL =
  "flex h-8 items-center rounded-full bg-card/70 inset-ring-[0.5px] inset-ring-border backdrop-blur-md backdrop-saturate-150";

export function ItemCardLink({
  item,
  itemTags,
  morphing,
  isPending,
  onEdit,
  onDelete,
  onRefreshPreview,
}: ItemCardBaseProps & {
  item: Extract<LibraryItemSummary, { type: "link" }>;
  onRefreshPreview: () => void;
}) {
  const t = useDictionary();
  const safeHref = item.url ? normalizeHttpUrl(item.url) : null;
  const domain = safeHref ? new URL(safeHref).hostname : null;
  // The user's own description always wins; the enrichment pipeline's
  // remote_description only fills a gap the user left empty, never
  // overrides authored text.
  const displayDescription =
    item.description ?? item.preview?.remoteDescription ?? null;
  const faviconSrc = item.preview?.faviconHash
    ? previewImageSrc(item.id, "icon", item.preview.faviconHash)
    : null;

  const badge = <ItemTypeBadge type={item.type} isPending={isPending} />;

  const actions = (
    <ItemCardActions
      title={item.title}
      onEdit={onEdit}
      onDelete={onDelete}
      onRefreshPreview={onRefreshPreview}
    >
      {safeHref ? (
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
                aria-label={t.items.card.openLinkNewTab}
                className={ACTION_CLASS}
                render={
                  // O Base UI clona este anchor injetando children (o ícone) e
                  // o aria-label do Button acima. A tag está vazia no fonte,
                  // nunca em runtime -- o lint não enxerga a composição.
                  // eslint-disable-next-line jsx-a11y/anchor-has-content
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
          <TooltipContent>{t.items.card.openLink}</TooltipContent>
        </Tooltip>
      ) : null}
      {safeHref ? <CopyLinkAction href={safeHref} Icon={CopyIcon} /> : null}
    </ItemCardActions>
  );

  // Favicon/monogram + hostname (Figma: the row under the media). A link
  // whose URL didn't survive `normalizeHttpUrl` has no media layout to sit
  // in, so this row is also where "Link inválido" is reported -- the card
  // must still say why it can't be opened.
  const siteRow = (
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
        {domain ?? t.items.card.invalidLink}
      </span>
    </div>
  );

  const heading = (
    <ItemCardHeading
      title={item.title}
      description={displayDescription}
      morphing={morphing}
      descriptionClamp="line-clamp-2"
    />
  );

  return (
    <ItemCardFrame morphing={morphing} isPending={isPending}>
      {safeHref && domain ? (
        <>
          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 flex-col rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            {/* The media clips itself instead of relying on the article's
              rounded overflow alone. On hover the thumbnail scales, which
              moves it to its own compositor layer; Chrome then clips that
              layer at the ancestor's rounded corners with different
              anti-aliasing than the rest of the card, and at fractional
              device scales (1.25x/1.5x -- Windows' defaults) the image
              showed through as a bright fringe at both top corners.
              Measured, not guessed: without the zoom the fringe is gone;
              with this clip on the nearest ancestor it is gone too, and the
              rest state is pixel-identical. */}
            <div className="relative overflow-hidden rounded-t-2xl">
              <LinkPreviewMedia
                itemId={item.id}
                domain={domain}
                preview={item.preview}
              />
            </div>
            <div className="flex flex-1 flex-col gap-4 p-4">
              {siteRow}
              {heading}
            </div>
          </a>
          {/* The header floats over the media instead of nesting inside the
            anchor: a <button> inside an <a> is invalid HTML and would add a
            second tab stop. It comes *after* the anchor in DOM order so Tab
            still reaches the card's own link first, and
            `pointer-events-none` on the wrapper hands the clicks it covers
            back to that anchor underneath; the actions themselves opt back
            in.
            Badge and actions sit on whatever the thumbnail shows there, so
            each gets its own glass pill (AAA-180: a light thumbnail erased
            the icons). This replaces Figma's "OG:IMAGE" (163:928)
            surface-to-transparent gradient, which in light mode washed the
            top of every thumbnail into a white fog. Deliberate exception to
            DESIGN.md's no-glass rule, scoped to media overlays.
            The glass follows the theme (light pill, dark glyphs in light
            mode). Its 70% tint is what keeps that working over the worst
            case: dark glyphs over a black thumbnail need ~40% of the light
            surface to clear 3:1, and 70% is the floor for the dark theme's
            teal badge text to keep 4.5:1 over a white one. The actions pill
            fades with the icons (ACTION_CLASS) so no empty pill shows at
            rest. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2.5 p-4 pb-2">
            <div className={cn(MEDIA_PILL, "min-w-0 pr-2.5 pl-2")}>{badge}</div>
            {/* Icon buttons (pill > actions > button, hence `*:*:`; the
              tooltip/menu triggers overwrite `data-slot`, so position is the
              stable hook) become 28px circles. `p-0.5` keeps a hovered
              button's circle 2px from the pill on every side and lands the
              pill on the badge's 32px. */}
            <div
              className={cn(
                MEDIA_PILL,
                ACTION_CLASS,
                "p-0.5 *:*:size-7 *:*:rounded-full",
              )}
            >
              {actions}
            </div>
          </div>
          {itemTags.length > 0 && (
            <div className="flex px-4 pb-4">
              <ItemTags tags={itemTags} />
            </div>
          )}
        </>
      ) : (
        <ItemCardPlainLayout badge={badge} actions={actions}>
          {siteRow}
          {heading}
          <ItemTags tags={itemTags} />
        </ItemCardPlainLayout>
      )}
    </ItemCardFrame>
  );
}
