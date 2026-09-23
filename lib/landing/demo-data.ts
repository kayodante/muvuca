import type { TagColorToken } from "@/lib/validation/tag";
import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

export interface DemoTag {
  id: string;
  name: string;
  parentId: string | null;
  colorToken: TagColorToken;
  count: number;
}

export interface DemoItem {
  id: string;
  type: "link" | "prompt";
  title: string;
  description?: string;
  url?: string;
  contentPreview?: string;
  tagIds: string[];
}

/**
 * Structure (ids, hierarchy, colors, counts) stays language-neutral here;
 * text (`name`/`title`/`description`/`contentPreview`) comes from
 * `t.landing.demo` so the demo acervo is localized like the rest of the
 * landing page. Callers get `t` from `useDictionary()`.
 */
export function demoTags(t: Dictionary): DemoTag[] {
  const n = t.landing.demo.tags;
  return [
    {
      id: "skills",
      name: n.skills,
      parentId: null,
      colorToken: "lime",
      count: 128,
    },
    {
      id: "design",
      name: n.design,
      parentId: "skills",
      colorToken: "teal",
      count: 54,
    },
    {
      id: "branding",
      name: n.branding,
      parentId: "design",
      colorToken: "pink",
      count: 18,
    },
    {
      id: "product-design",
      name: n.productDesign,
      parentId: "design",
      colorToken: "cyan",
      count: 36,
    },
    {
      id: "desenvolvimento",
      name: n.desenvolvimento,
      parentId: "skills",
      colorToken: "blue",
      count: 42,
    },
    {
      id: "frontend",
      name: n.frontend,
      parentId: "desenvolvimento",
      colorToken: "violet",
      count: 24,
    },
    {
      id: "ia",
      name: n.ia,
      parentId: "desenvolvimento",
      colorToken: "emerald",
      count: 18,
    },
    {
      id: "produtividade",
      name: n.produtividade,
      parentId: "skills",
      colorToken: "amber",
      count: 32,
    },
    {
      id: "referencias",
      name: n.referencias,
      parentId: null,
      colorToken: "orange",
      count: 76,
    },
    {
      id: "artigos",
      name: n.artigos,
      parentId: null,
      colorToken: "stone",
      count: 45,
    },
  ];
}

export function demoItems(t: Dictionary): DemoItem[] {
  const it = t.landing.demo.items;
  return [
    {
      id: "item-1",
      type: "link",
      title: it.item1.title,
      description: it.item1.description,
      url: "https://linear.app",
      tagIds: ["skills", "design", "product-design"],
    },
    {
      id: "item-2",
      type: "prompt",
      title: it.item2.title,
      description: it.item2.description,
      contentPreview: it.item2.contentPreview,
      tagIds: ["skills", "desenvolvimento", "ia"],
    },
    {
      id: "item-3",
      type: "link",
      title: it.item3.title,
      description: it.item3.description,
      url: "https://minimal.gallery",
      tagIds: ["skills", "design", "branding", "referencias"],
    },
    {
      id: "item-4",
      type: "prompt",
      title: it.item4.title,
      description: it.item4.description,
      contentPreview: it.item4.contentPreview,
      tagIds: ["skills", "desenvolvimento", "frontend"],
    },
    {
      id: "item-5",
      type: "link",
      title: it.item5.title,
      description: it.item5.description,
      url: "https://tailwindcss.com/docs",
      tagIds: ["skills", "desenvolvimento", "frontend"],
    },
    {
      id: "item-6",
      type: "link",
      title: it.item6.title,
      description: it.item6.description,
      url: "https://tokenterminal.com",
      tagIds: ["skills", "design", "product-design", "referencias"],
    },
    {
      id: "item-7",
      type: "prompt",
      title: it.item7.title,
      description: it.item7.description,
      contentPreview: it.item7.contentPreview,
      tagIds: ["skills", "desenvolvimento", "frontend"],
    },
  ];
}

export function getDescendantTagIds(tagId: string, tags: DemoTag[]): string[] {
  const children = tags.filter((t) => t.parentId === tagId);
  const childIds = children.map((c) => c.id);
  const deeperIds = children.flatMap((c) => getDescendantTagIds(c.id, tags));
  return [tagId, ...childIds, ...deeperIds];
}

export function getItemsForTag(
  tagId: string,
  tags: DemoTag[],
  items: DemoItem[],
): DemoItem[] {
  const targetTagIds = new Set(getDescendantTagIds(tagId, tags));
  return items.filter((item) => item.tagIds.some((id) => targetTagIds.has(id)));
}
