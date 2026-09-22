"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CodeXmlIcon, FileTextIcon, LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CODE_LANGUAGE_LABELS,
  CODE_LANGUAGES,
  isCodeLanguage,
} from "@/lib/code/languages";
import type { LibraryItem } from "@/lib/database/queries/items";
import type { Tag } from "@/lib/database/queries/tags";
import type { ItemType } from "@/lib/validation/item";
import { createItem, updateItem } from "@/lib/actions/items";
import { listTagsForSelect } from "@/lib/actions/tags";
import { notifyPreviewQueueChanged } from "@/lib/events/preview-queue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TagSelectField } from "./TagSelectField";

export type EditorTarget =
  { mode: "create" } | { mode: "edit"; item: LibraryItem };

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label-md">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type TagsLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; tags: Tag[] };

const ITEM_TYPES_CONFIG = [
  {
    type: "link" as const,
    label: "Link",
    Icon: LinkIcon,
    colorClass: "text-type-link",
  },
  {
    type: "prompt" as const,
    label: "Prompt",
    Icon: FileTextIcon,
    colorClass: "text-type-prompt",
  },
  {
    type: "code_component" as const,
    label: "Componente de código",
    Icon: CodeXmlIcon,
    colorClass: "text-type-code",
  },
];

export function ItemEditorDialog({
  target,
  onOpenChange,
}: {
  target: EditorTarget;
  onOpenChange: (open: boolean) => void;
}) {
  const [createState, createAction, createPending] = useActionState(
    createItem,
    null,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateItem,
    null,
  );
  const editing = target.mode === "edit" ? target.item : null;

  const [tagsState, setTagsState] = useState<TagsLoadState>({
    status: "loading",
  });
  // Bumped by the retry button to re-run the effect below; the effect
  // itself only ever calls setState from the resolved-promise callback; see
  // https://react.dev/reference/react/useEffect#fetching-data-with-effects
  const [tagsAttempt, setTagsAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listTagsForSelect().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setTagsState({ status: "success", tags: result.data });
      } else {
        setTagsState({ status: "error", message: result.message });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tagsAttempt]);

  const retryLoadTags = useCallback(() => {
    setTagsState({ status: "loading" });
    setTagsAttempt((attempt) => attempt + 1);
  }, []);

  const tags = tagsState.status === "success" ? tagsState.tags : [];
  const tagsLoading = tagsState.status === "loading";
  const tagsErrorMessage =
    tagsState.status === "error" ? tagsState.message : null;
  const tagsEmpty = tagsState.status === "success" && tags.length === 0;
  const tagsFieldDisabled =
    tagsLoading || tagsErrorMessage !== null || tagsEmpty;
  const [type, setType] = useState<ItemType>(editing?.type ?? "link");
  const [content, setContent] = useState(
    editing?.type === "prompt" || editing?.type === "code_component"
      ? editing.content
      : "",
  );
  const state = editing ? updateState : createState;
  const formAction = editing ? updateAction : createAction;
  const pending = editing ? updatePending : createPending;

  useEffect(() => {
    if (state?.ok) {
      toast.success(editing ? "Item atualizado." : "Item criado.");
      // Creating a link, or editing one's URL, can (re-)enqueue a
      // link_previews job server-side (trigger). Wake a drain session
      // that already found the queue empty and stopped.
      notifyPreviewQueueChanged();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const fieldError = (field: string) =>
    state?.ok === false ? state.fieldErrors?.[field]?.[0] : undefined;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <form action={formAction} className="flex flex-col gap-5">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <DialogHeader>
            <DialogTitle>{editing ? "Editar item" : "Novo item"}</DialogTitle>
            <DialogDescription>
              Links, prompts e componentes ficam privados na sua biblioteca.
            </DialogDescription>
          </DialogHeader>

          <fieldset
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            aria-label="Tipo do item"
          >
            {ITEM_TYPES_CONFIG.map(
              ({ type: itemType, label, Icon, colorClass }) => {
                const isChecked = type === itemType;
                return (
                  <label
                    key={itemType}
                    className={cn(
                      "group relative flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-[background-color,border-color,transform,box-shadow] duration-(--motion-fast) ease-out-muvuca select-none active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
                      isChecked
                        ? "border-foreground/30 bg-secondary text-foreground shadow-xs"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                    )}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={itemType}
                      checked={isChecked}
                      onChange={() => setType(itemType)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-lg ring-offset-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
                    />
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "size-4 shrink-0 transition-transform duration-(--motion-fast) ease-out-muvuca group-hover:scale-110 motion-reduce:group-hover:scale-100",
                        colorClass,
                      )}
                    />
                    <span>{label}</span>
                  </label>
                );
              },
            )}
          </fieldset>

          <Field id="item-title" label="Título" error={fieldError("title")}>
            <Input
              id="item-title"
              name="title"
              dir="auto"
              required
              maxLength={240}
              defaultValue={editing?.title}
              aria-describedby={
                fieldError("title") ? "item-title-error" : undefined
              }
              aria-invalid={!!fieldError("title") || undefined}
            />
          </Field>

          {type === "link" && (
            <Field id="item-url" label="URL" error={fieldError("url")}>
              <Input
                id="item-url"
                name="url"
                type="url"
                required
                maxLength={4096}
                defaultValue={editing?.type === "link" ? editing.url : ""}
                placeholder="https://exemplo.com"
                aria-describedby={
                  fieldError("url") ? "item-url-error" : undefined
                }
                aria-invalid={!!fieldError("url") || undefined}
              />
            </Field>
          )}

          {type === "prompt" && (
            <Field
              id="item-content"
              label="Conteúdo"
              error={fieldError("content")}
            >
              <Textarea
                id="item-content"
                name="content"
                dir="auto"
                required
                maxLength={100000}
                rows={14}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-64 resize-y leading-6"
                aria-describedby={
                  fieldError("content") ? "item-content-error" : undefined
                }
                aria-invalid={!!fieldError("content") || undefined}
              />
              {/* Tabular numerals: the counter updates on every keystroke,
                  and proportional digits make it twitch as it climbs. */}
              <p className="text-body-sm text-right text-muted-foreground tabular-nums">
                {content.length.toLocaleString("pt-BR")} / 100.000 caracteres
              </p>
            </Field>
          )}

          {type === "code_component" && (
            <>
              <Field
                id="item-content"
                label="Código"
                error={fieldError("content")}
              >
                <Textarea
                  id="item-content"
                  name="content"
                  required
                  maxLength={100000}
                  rows={14}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Cole o código do componente aqui..."
                  className="min-h-64 resize-y font-mono text-sm leading-6"
                  aria-describedby={
                    fieldError("content") ? "item-content-error" : undefined
                  }
                  aria-invalid={!!fieldError("content") || undefined}
                />
                <p className="text-body-sm text-right text-muted-foreground tabular-nums">
                  {content.length.toLocaleString("pt-BR")} / 100.000 caracteres
                </p>
              </Field>

              {/* Invariante: o Select vive dentro do branch de
                  `code_component`, então trocar o tipo para link/prompt o
                  desmonta junto do input oculto `name="language"` — a chave
                  simplesmente não vai no FormData, e os schemas Zod de
                  link/prompt a descartariam de qualquer forma (o mapeamento
                  "" -> null fica em `itemFormData`). Nenhum reset manual. */}
              <Field
                id="item-language"
                label="Linguagem (opcional)"
                error={fieldError("language")}
              >
                <Select
                  name="language"
                  defaultValue={
                    editing?.type === "code_component"
                      ? (editing.language ?? "")
                      : ""
                  }
                >
                  <SelectTrigger
                    id="item-language"
                    className="w-full"
                    aria-describedby={
                      fieldError("language") ? "item-language-error" : undefined
                    }
                    aria-invalid={!!fieldError("language") || undefined}
                  >
                    {/* Vale o mesmo do Select de tag pai em TagEditor: Value
                        resolve o rótulo pelo mapeamento local, não pelo
                        registro dos items, que só montam quando o popup abre
                        (e no primeiro paint o popup está fechado). */}
                    <SelectValue placeholder="Texto puro">
                      {(value: string) =>
                        value === ""
                          ? "Texto puro"
                          : isCodeLanguage(value)
                            ? CODE_LANGUAGE_LABELS[value]
                            : value
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Texto puro</SelectItem>
                    {CODE_LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {CODE_LANGUAGE_LABELS[lang]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                id="item-url"
                label="Link da fonte (opcional)"
                error={fieldError("url")}
              >
                <Input
                  id="item-url"
                  name="url"
                  type="url"
                  maxLength={4096}
                  defaultValue={
                    editing?.type === "code_component"
                      ? (editing.url ?? "")
                      : ""
                  }
                  placeholder="https://exemplo.com/componente"
                  aria-describedby={
                    fieldError("url") ? "item-url-error" : undefined
                  }
                  aria-invalid={!!fieldError("url") || undefined}
                />
              </Field>
            </>
          )}

          <Field
            id="item-description"
            label="Descrição (opcional)"
            error={fieldError("description")}
          >
            <Textarea
              id="item-description"
              name="description"
              dir="auto"
              maxLength={2000}
              rows={3}
              defaultValue={editing?.description ?? ""}
              aria-describedby={
                fieldError("description") ? "item-description-error" : undefined
              }
              aria-invalid={!!fieldError("description") || undefined}
            />
          </Field>

          <Field
            id="item-tags"
            label="Tags (opcional)"
            error={fieldError("tagIds")}
          >
            <TagSelectField
              id="item-tags"
              tags={tags}
              defaultValue={editing?.tagIds ?? []}
              disabled={tagsFieldDisabled}
              error={fieldError("tagIds")}
              emptyLabel={
                tagsLoading
                  ? "Carregando tags..."
                  : tagsErrorMessage !== null
                    ? "Não foi possível carregar as tags"
                    : undefined
              }
              ariaDescribedBy={[
                tagsErrorMessage !== null
                  ? "item-tags-load-error"
                  : "item-tags-hint",
                fieldError("tagIds") ? "item-tags-error" : null,
              ]
                .filter(Boolean)
                .join(" ")}
            />
            {tagsErrorMessage !== null ? (
              <div className="flex flex-col gap-2">
                <p
                  id="item-tags-load-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {tagsErrorMessage}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={retryLoadTags}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <p
                id="item-tags-hint"
                className="text-body-sm text-muted-foreground"
              >
                {tagsLoading
                  ? "Carregando tags..."
                  : tagsEmpty
                    ? "Crie tags na seção Tags para organizar seus itens."
                    : "Selecione uma ou mais tags para organizar o item."}
              </p>
            )}
          </Field>

          {state?.ok === false && !state.fieldErrors && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" pending={pending}>
              {editing ? "Salvar alterações" : "Criar item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
