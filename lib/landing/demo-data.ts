import type { TagColorToken } from "@/lib/validation/tag";

export interface DemoTag {
  id: string;
  name: string;
  parentId: string | null;
  colorToken: TagColorToken;
  count: number;
  description?: string;
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

export const DEMO_TAGS: DemoTag[] = [
  {
    id: "skills",
    name: "Skills",
    parentId: null,
    colorToken: "lime",
    count: 128,
  },
  {
    id: "design",
    name: "Design",
    parentId: "skills",
    colorToken: "teal",
    count: 54,
  },
  {
    id: "branding",
    name: "Branding",
    parentId: "design",
    colorToken: "pink",
    count: 18,
  },
  {
    id: "product-design",
    name: "Product Design",
    parentId: "design",
    colorToken: "cyan",
    count: 36,
  },
  {
    id: "desenvolvimento",
    name: "Desenvolvimento",
    parentId: "skills",
    colorToken: "blue",
    count: 42,
  },
  {
    id: "frontend",
    name: "Front-end",
    parentId: "desenvolvimento",
    colorToken: "violet",
    count: 24,
  },
  {
    id: "ia",
    name: "IA & Prompts",
    parentId: "desenvolvimento",
    colorToken: "emerald",
    count: 18,
  },
  {
    id: "produtividade",
    name: "Produtividade",
    parentId: "skills",
    colorToken: "amber",
    count: 32,
  },
  {
    id: "referencias",
    name: "Referências",
    parentId: null,
    colorToken: "orange",
    count: 76,
  },
  {
    id: "artigos",
    name: "Artigos",
    parentId: null,
    colorToken: "stone",
    count: 45,
  },
];

export const DEMO_ITEMS: DemoItem[] = [
  {
    id: "item-1",
    type: "link",
    title: "Linear — Issue tracking for high-velocity teams",
    description:
      "Referência de interface densa com navegação por teclado e performance de resposta em milissegundos.",
    url: "https://linear.app",
    tagIds: ["skills", "design", "product-design"],
  },
  {
    id: "item-2",
    type: "prompt",
    title: "System Prompt: Senior Code Reviewer",
    description:
      "Auditoria com foco em integridade de banco de dados, RLS e ausência de any.",
    contentPreview:
      "Atue como um Senior Code Reviewer. Analise o diff priorizando: 1. Segurança e RLS; 2. Tipagem estrita sem any; 3. Acessibilidade WCAG AA; 4. Queries parametrizadas.",
    tagIds: ["skills", "desenvolvimento", "ia"],
  },
  {
    id: "item-3",
    type: "link",
    title: "Minimal Gallery — Curated web design inspiration",
    description:
      "Diretório curado com foco em grid editorial, tipografia precisa e microinterações elegantes.",
    url: "https://minimal.gallery",
    tagIds: ["skills", "design", "branding", "referencias"],
  },
  {
    id: "item-4",
    type: "prompt",
    title: "Refatoração de Componentes Acessíveis",
    description:
      "Guia de boas práticas para garantir navegação por teclado e conformidade WCAG 2.2 AA.",
    contentPreview:
      "Substitua divs clicáveis por <button>, garanta aria-label em botões de ícone e associe mensagens de erro com aria-describedby.",
    tagIds: ["skills", "desenvolvimento", "frontend"],
  },
  {
    id: "item-5",
    type: "link",
    title: "Tailwind CSS v4 Documentation",
    description:
      "Guia completo da nova engine CSS baseada em variáveis nativas e cascade layers.",
    url: "https://tailwindcss.com/docs",
    tagIds: ["skills", "desenvolvimento", "frontend"],
  },
  {
    id: "item-6",
    type: "link",
    title: "Token Terminal — Financial metrics for crypto",
    description:
      "Referência de grid com hairlines de 1px, tipografia Geist Mono e composição densa e calma.",
    url: "https://tokenterminal.com",
    tagIds: ["skills", "design", "product-design", "referencias"],
  },
  {
    id: "item-7",
    type: "prompt",
    title: "Extrator de DTO Puro de Bookmarks",
    description:
      "Algoritmo seguro para parsing de arquivo Netscape Bookmarks no cliente com DOMParser inerte.",
    contentPreview:
      "function parseBookmarksHtml(rawHtml: string): BookmarkFolderTree {\n  const parser = new DOMParser();\n  const doc = parser.parseFromString(rawHtml, 'text/html');\n  // extrai estritamente textContent e atributos href\n}",
    tagIds: ["skills", "desenvolvimento", "frontend"],
  },
];

export function getDescendantTagIds(tagId: string): string[] {
  const children = DEMO_TAGS.filter((t) => t.parentId === tagId);
  const childIds = children.map((c) => c.id);
  const deeperIds = children.flatMap((c) => getDescendantTagIds(c.id));
  return [tagId, ...childIds, ...deeperIds];
}

export function getItemsForTag(tagId: string): DemoItem[] {
  const targetTagIds = new Set(getDescendantTagIds(tagId));
  return DEMO_ITEMS.filter((item) =>
    item.tagIds.some((id) => targetTagIds.has(id)),
  );
}
