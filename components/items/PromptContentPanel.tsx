import { tokenizePromptContext } from "@/lib/prompt/context-tokens";

/**
 * Moldura de conteúdo do dialog de detalhe.
 *
 * O conteúdo salvo é tratado como um bloco com identidade própria, não
 * como mais um parágrafo do dialog. O header repete o tipo em Geist Pixel e
 * acrescenta os contadores porque um prompt aceita até 100.000 caracteres e,
 * sem isso, o usuário só descobre o tamanho rolando.
 *
 * Sem "use client": o componente não tem estado, efeito nem handler. Ele já
 * chega ao bundle do cliente por ser importado de PromptDetailDialog.
 *
 * Não tem rodapé com "copiar": PromptDetailDialog já oferece a ação no
 * DialogFooter logo abaixo, e um segundo botão idêntico seria um tab stop
 * duplicado para a mesma ação.
 */
const VARIANT_META = {
  prompt: { label: "prompt", hue: "text-type-prompt" },
  code_component: { label: "code", hue: "text-type-code" },
} as const;

function pluralize(count: number, singular: string, plural: string) {
  return `${count.toLocaleString("pt-BR")} ${count === 1 ? singular : plural}`;
}

/**
 * Um tratamento só para as quatro categorias de referência. O que importa ao
 * leitor é "isto é uma referência, não prosa"; a categoria fica em
 * `data-token-kind`, para os testes e para uma decisão de design futura.
 */
const TOKEN_CLASS =
  // Lime da marca (`--color-primary`, a mesma fonte de `--tag-lime` --
  // reaproveitado aqui para que exista uma única fonte de verdade para esse
  // tom) em opacidade baixa, maior no escuro pro mesmo tom ficar
  // perceptível nos dois temas -- mesmo padrão já usado no repo em
  // `bg-destructive/10 dark:bg-destructive/20` (components/ui/badge.tsx).
  // Desvio deliberado da diretriz original de "sem lime": decisão explícita
  // do dono do produto após ver o realce neutro em produção.
  "rounded-sm bg-primary/20 px-1 font-mono text-[0.92em] dark:bg-primary/30";

function PromptBody({ content }: { content: string }) {
  const tokens = tokenizePromptContext(content);

  return (
    <p
      dir="auto"
      className="text-body-md leading-7 break-words whitespace-pre-wrap"
    >
      {tokens.map((token, index) =>
        token.kind === "text" ? (
          // Nó de texto React puro. Nada aqui vira HTML.
          <span key={index}>{token.value}</span>
        ) : (
          <span
            key={index}
            data-token-kind={token.kind}
            className={TOKEN_CLASS}
          >
            {token.value}
          </span>
        ),
      )}
    </p>
  );
}

export function PromptContentPanel({
  content,
  variant,
}: {
  content: string;
  variant: "prompt" | "code_component";
}) {
  const meta = VARIANT_META[variant];
  // Um `\n` final (comum em conteúdo colado, e o schema não faz trim -- ver
  // lib/validation/item.ts) não é uma linha a mais: é o fim da última linha.
  const lineCount = content.replace(/\n$/, "").split("\n").length;
  // Code points, não unidades UTF-16: é assim que o `char_length` do Postgres
  // conta na constraint library_items_type_payload, e um emoji contaria 2 em
  // `content.length`.
  const charCount = [...content].length;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/60 px-4 py-2">
        {/* Concatenação literal, não `cn()`: twMerge trata qualquer par
            `text-*` como o mesmo grupo "cor de texto" e descartaria
            text-brand-pixel (fonte) em favor de meta.hue (cor). */}
        <span className={`text-brand-pixel ${meta.hue}`}>{meta.label}</span>
        <span className="text-metadata text-muted-foreground">
          {pluralize(lineCount, "linha", "linhas")} ·{" "}
          {pluralize(charCount, "caractere", "caracteres")}
        </span>
      </div>
      <div className="max-h-[min(65dvh,44rem)] overflow-auto bg-secondary/30 p-4">
        {variant === "code_component" ? (
          <pre>
            <code className="text-body-sm font-mono leading-6 break-words whitespace-pre-wrap">
              {content}
            </code>
          </pre>
        ) : (
          <PromptBody content={content} />
        )}
      </div>
    </div>
  );
}
