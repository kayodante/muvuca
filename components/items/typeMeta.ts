import { CodeXmlIcon, FileTextIcon, LinkIcon } from "lucide-react";

import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

/**
 * Type badge (Figma "Meta"): lowercase Geist Pixel label in the type's own
 * hue, always visible. The colors are theme-aware tokens (`--type-*`), not
 * the raw tag palette -- emerald/orange at their mockup shade reprove AA on
 * the light surface at this size, and the mockup is dark-only.
 *
 * `hint` is the accessible name of the trailing info button and the text of
 * its tooltip: the pixel face plus a 3-letter word is a weak label on its
 * own, so the type is also available as plain prose to anyone hovering,
 * focusing, or using a screen reader. Icon/hue are locale-independent, so
 * only `label`/`hint` come from the dictionary -- built inside the caller
 * (not a module constant) since they depend on `t`.
 *
 * Shared by ItemCard, the spotlight row and QuickLook so the three never
 * disagree on which icon/hue/label goes with which item type.
 */
export function typeMetaFor(t: Dictionary) {
  return {
    link: {
      label: t.items.card.types.link.label,
      hue: "text-type-link",
      Icon: LinkIcon,
      hint: t.items.card.types.link.hint,
    },
    prompt: {
      label: t.items.card.types.prompt.label,
      hue: "text-type-prompt",
      Icon: FileTextIcon,
      hint: t.items.card.types.prompt.hint,
    },
    code_component: {
      label: t.items.card.types.code_component.label,
      hue: "text-type-code",
      Icon: CodeXmlIcon,
      hint: t.items.card.types.code_component.hint,
    },
  } as const;
}
