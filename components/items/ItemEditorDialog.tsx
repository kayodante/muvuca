"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
import { TAG_COLOR_TOKENS } from "@/lib/validation/tag";
import { createItem, updateItem } from "@/lib/actions/items";
import { createTag, listTagsForSelect } from "@/lib/actions/tags";
import { notifyPreviewQueueChanged } from "@/lib/events/preview-queue";
import { useDictionary } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { toastSuccess } from "@/components/states/Toast";
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

function itemTypesConfig(t: Dictionary) {
  return [
    {
      type: "link" as const,
      label: t.items.editor.types.link,
      Icon: LinkIcon,
      colorClass: "text-type-link",
    },
    {
      type: "prompt" as const,
      label: t.items.editor.types.prompt,
      Icon: FileTextIcon,
      colorClass: "text-type-prompt",
    },
    {
      type: "code_component" as const,
      label: t.items.editor.types.code_component,
      Icon: CodeXmlIcon,
      colorClass: "text-type-code",
    },
  ];
}

export function ItemEditorDialog({
  target,
  onOpenChange,
}: {
  target: EditorTarget;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useDictionary();
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

  // Tag criada pelo seletor nasce na raiz com cor sorteada da paleta, como a
  // importação de bookmarks faz; pai, cor e descrição se ajustam em /tags.
  // A lista é relida em vez de montada à mão: `path` só existe no servidor.
  const createTagFromPicker = useCallback(async (name: string) => {
    const formData = new FormData();
    formData.set("name", name);
    formData.set(
      "colorToken",
      TAG_COLOR_TOKENS[Math.floor(Math.random() * TAG_COLOR_TOKENS.length)] ??
        "lime",
    );
    const created = await createTag(null, formData);
    if (!created.ok) return created;
    const reloaded = await listTagsForSelect();
    if (!reloaded.ok) {
      setTagsState({ status: "error", message: reloaded.message });
      return reloaded;
    }
    setTagsState({ status: "success", tags: reloaded.data });
    return created;
  }, []);

  const tags = tagsState.status === "success" ? tagsState.tags : [];
  const tagsLoading = tagsState.status === "loading";
  const tagsErrorMessage =
    tagsState.status === "error" ? tagsState.message : null;
  const tagsEmpty = tagsState.status === "success" && tags.length === 0;
  const tagsFieldDisabled = tagsLoading || tagsErrorMessage !== null;
  const [type, setType] = useState<ItemType>(editing?.type ?? "link");
  const [selectedTagIds, setSelectedTagIds] = useState(editing?.tagIds ?? []);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [content, setContent] = useState(
    editing?.type === "prompt" || editing?.type === "code_component"
      ? editing.content
      : "",
  );
  const [languageSelection, setLanguageSelection] = useState(
    editing?.type === "code_component" ? (editing.language ?? "") : "",
  );
  const state = editing ? updateState : createState;
  const formAction = editing ? updateAction : createAction;
  const pending = editing ? updatePending : createPending;

  const checkDirty = useCallback(
    (tagIds = selectedTagIds) => {
      if (!formRef.current) return;
      const data = new FormData(formRef.current);
      const currentType = data.get("type");
      const initialType = editing?.type ?? "link";
      const sameTags =
        tagIds.length === (editing?.tagIds.length ?? 0) &&
        tagIds.every((id) => editing?.tagIds.includes(id));
      setDirty(
        currentType !== initialType ||
          data.get("title") !== (editing?.title ?? "") ||
          data.get("description") !== (editing?.description ?? "") ||
          (currentType !== "prompt" &&
            data.get("url") !==
              (editing?.type === "link" || editing?.type === "code_component"
                ? (editing.url ?? "")
                : "")) ||
          (currentType !== "link" &&
            data.get("content") !==
              (editing?.type === "prompt" || editing?.type === "code_component"
                ? editing.content
                : "")) ||
          (currentType === "code_component" &&
            data.get("language") !==
              (editing?.type === "code_component"
                ? (editing.language ?? "")
                : "")) ||
          !sameTags,
      );
    },
    [editing, selectedTagIds],
  );

  useEffect(() => {
    checkDirty();
  }, [type, languageSelection, checkDirty]);

  useEffect(() => {
    if (!dirty) return;
    const warnOnRefresh = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnOnRefresh);
    return () => window.removeEventListener("beforeunload", warnOnRefresh);
  }, [dirty]);

  const requestClose = (open: boolean) => {
    if (open || pending) return;
    if (dirty) setConfirmDiscard(true);
    else onOpenChange(false);
  };

  useEffect(() => {
    if (state?.ok) {
      toastSuccess(
        editing ? t.items.editor.itemUpdated : t.items.editor.itemCreated,
      );
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
    <>
      <Dialog open onOpenChange={requestClose}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <form
            ref={formRef}
            action={formAction}
            onInput={() => checkDirty()}
            onChange={() => checkDirty()}
            className="flex min-h-0 flex-col"
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <DialogHeader className="shrink-0 px-4 pt-4 pr-12 pb-3">
              <DialogTitle>
                {editing
                  ? t.items.editor.editTitle
                  : t.items.editor.createTitle}
              </DialogTitle>
              <DialogDescription>
                {t.items.editor.dialogDescription}
              </DialogDescription>
            </DialogHeader>

            <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-4 py-2">
              <fieldset
                className="grid grid-cols-3 gap-1.5 sm:gap-2"
                aria-label={t.items.editor.typeFieldsetLabel}
              >
                {itemTypesConfig(t).map(
                  ({ type: itemType, label, Icon, colorClass }) => {
                    const isChecked = type === itemType;
                    return (
                      <label
                        key={itemType}
                        className={cn(
                          "group relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-center text-xs leading-4 font-medium transition-[background-color,border-color,scale,box-shadow] duration-(--motion-fast) ease-out-muvuca select-none active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm",
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
                          className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-lg ring-offset-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
                        />
                        <Icon
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none size-4 shrink-0 transition-transform duration-(--motion-fast) ease-out-muvuca group-hover:scale-110 motion-reduce:group-hover:scale-100",
                            colorClass,
                          )}
                        />
                        <span className="pointer-events-none">{label}</span>
                      </label>
                    );
                  },
                )}
              </fieldset>

              <Field
                id="item-title"
                label={t.items.editor.fields.title}
                error={fieldError("title")}
              >
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
                    placeholder={t.items.editor.urlPlaceholder}
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
                  label={t.items.editor.fields.content}
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
                    {t.items.editor.charCounter(content.length)}
                  </p>
                </Field>
              )}

              {type === "code_component" && (
                <>
                  <Field
                    id="item-content"
                    label={t.items.editor.fields.code}
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
                      placeholder={t.items.editor.codePlaceholder}
                      className="min-h-64 resize-y font-mono text-sm leading-6"
                      aria-describedby={
                        fieldError("content") ? "item-content-error" : undefined
                      }
                      aria-invalid={!!fieldError("content") || undefined}
                    />
                    <p className="text-body-sm text-right text-muted-foreground tabular-nums">
                      {t.items.editor.charCounter(content.length)}
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
                    label={t.items.editor.fields.language}
                    error={fieldError("language")}
                  >
                    <Select
                      name="language"
                      onValueChange={(value) =>
                        setLanguageSelection(value ?? "")
                      }
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
                          fieldError("language")
                            ? "item-language-error"
                            : undefined
                        }
                        aria-invalid={!!fieldError("language") || undefined}
                      >
                        {/* Vale o mesmo do Select de tag pai em TagForm: Value
                        resolve o rótulo pelo mapeamento local, não pelo
                        registro dos items, que só montam quando o popup abre
                        (e no primeiro paint o popup está fechado). */}
                        <SelectValue placeholder={t.items.editor.plainText}>
                          {(value: string) =>
                            value === ""
                              ? t.items.editor.plainText
                              : isCodeLanguage(value)
                                ? CODE_LANGUAGE_LABELS[value]
                                : value
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">
                          {t.items.editor.plainText}
                        </SelectItem>
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
                    label={t.items.editor.fields.sourceLink}
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
                      placeholder={t.items.editor.codeUrlPlaceholder}
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
                label={t.items.editor.fields.description}
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
                    fieldError("description")
                      ? "item-description-error"
                      : undefined
                  }
                  aria-invalid={!!fieldError("description") || undefined}
                />
              </Field>

              <Field
                id="item-tags"
                label={t.items.editor.fields.tags}
                error={fieldError("tagIds")}
              >
                <TagSelectField
                  id="item-tags"
                  tags={tags}
                  value={selectedTagIds}
                  onChange={(ids) => {
                    setSelectedTagIds(ids);
                    checkDirty(ids);
                  }}
                  disabled={tagsFieldDisabled}
                  error={fieldError("tagIds")}
                  emptyLabel={
                    tagsLoading
                      ? t.items.editor.tagsLoading
                      : tagsErrorMessage !== null
                        ? t.items.editor.tagsLoadFailedLabel
                        : undefined
                  }
                  emptyLoading={tagsLoading}
                  onCreateTag={createTagFromPicker}
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
                      className="self-start"
                      onClick={retryLoadTags}
                    >
                      {t.common.tryAgain}
                    </Button>
                  </div>
                ) : (
                  <p
                    id="item-tags-hint"
                    className="text-body-sm text-muted-foreground"
                  >
                    {tagsLoading
                      ? t.items.editor.tagsLoading
                      : tagsEmpty
                        ? t.items.editor.tagsEmptyHint
                        : t.items.editor.tagsSelectHint}
                  </p>
                )}
              </Field>

              {state?.ok === false && !state.fieldErrors && (
                <p role="alert" className="text-sm text-destructive">
                  {state.message}
                </p>
              )}
            </div>
            <DialogFooter className="mx-0 mt-2 mb-0 shrink-0 rounded-b-xl">
              <Button
                type="submit"
                pending={pending}
                pendingLabel={
                  editing ? t.items.editor.saving : t.items.editor.creating
                }
              >
                {editing
                  ? t.items.editor.saveChanges
                  : t.items.editor.createItem}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.items.editor.discardTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.items.editor.discardDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.items.editor.keepEditing}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmDiscard(false);
                onOpenChange(false);
              }}
            >
              {t.items.editor.discardConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
