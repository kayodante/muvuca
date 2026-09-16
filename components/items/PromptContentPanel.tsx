import { tokenizePromptContext } from "@/lib/prompt/context-tokens";
import type { CodeLanguage } from "@/lib/code/languages";
import { CodeSnippetEmbed } from "@/components/items/CodeSnippetEmbed";

/**
 * Moldura de conteúdo do dialog de detalhe.
 *
 * A variante `prompt` emoldura o conteúdo com header próprio (rótulo do tipo
 * em Geist Pixel + contadores de linha/caractere — um prompt aceita até
 * 100.000 caracteres e, sem isso, o usuário só descobre o tamanho rolando) e
 * o corpo em prosa com os tokens de contexto realçados.
 *
 * A variante `code_component` é delegada inteira ao CodeSnippetEmbed: ele já
 * traz o próprio header (badge "code" + linguagem, contadores e atalho de
 * cópia) e o corpo com régua de linhas e highlight. Um header do painel por
 * cima disso seria moldura dupla com contadores repetidos — por isso o
 * header antigo do painel passou a existir só para prompt.
 *
 * Sem "use client": o componente não tem estado, efeito nem handler. Ele já
 * chega ao bundle do cliente por ser importado de PromptDetailDialog (e o
 * embed, por sua vez, é client component).
 *
 * Não tem rodapé com "copiar": PromptDetailDialog já oferece a ação no
 * DialogFooter logo abaixo e, na variante de código, o embed tem um atalho
 * em ícone no próprio header — um botão de texto aqui seria um terceiro
 * tab stop para a mesma ação.
 */

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
  language,
}: {
  content: string;
  variant: "prompt" | "code_component";
  language?: CodeLanguage | null;
}) {
  if (variant === "code_component") {
    return <CodeSnippetEmbed content={content} language={language ?? null} />;
  }

  // Daqui em diante só há prompt. Um `\n` final (comum em conteúdo colado, e
  // o schema não faz trim -- ver lib/validation/item.ts) não é uma linha a
  // mais: é o fim da última linha.
  const lineCount = content.replace(/\n$/, "").split("\n").length;
  // Code points, não unidades UTF-16: é assim que o `char_length` do Postgres
  // conta na constraint library_items_type_payload, e um emoji contaria 2 em
  // `content.length`.
  const charCount = [...content].length;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/60 px-4 py-2">
        {/* Concat literal, não cn(): twMerge trata qualquer par text-* como
            o mesmo grupo "cor de texto" e descartaria text-brand-pixel
            (fonte) em favor da cor. */}
        <span className="text-brand-pixel text-type-prompt">prompt</span>
        <span className="text-metadata text-muted-foreground">
          {pluralize(lineCount, "linha", "linhas")} ·{" "}
          {pluralize(charCount, "caractere", "caracteres")}
        </span>
      </div>
      <div className="max-h-[min(65dvh,44rem)] overflow-auto bg-secondary/30 p-4">
        <PromptBody content={content} />
      </div>
    </div>
  );
}
