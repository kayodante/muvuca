import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

/**
 * `pnpm lint` é o único gate automatizado de acessibilidade estática do
 * repo. Sem esta guarda, apagar uma linha de `eslint.config.mjs` desliga
 * dezenas de regras em silêncio e o CI continua verde -- exatamente o modo
 * de falha que a Fase 7 do ROADMAP fechou.
 *
 * A config é lida pela API do ESLint, e não importando `eslint.config.mjs`:
 * `allowJs` é `false` no tsconfig, então o import não passaria no
 * typecheck -- e a config resolvida é o que o linter de fato aplica ao
 * arquivo, que é a pergunta que importa.
 */
async function resolveA11yRules(): Promise<string[]> {
  const config: unknown = await new ESLint().calculateConfigForFile(
    "components/items/ItemCard.tsx",
  );

  const rules = (config as { rules?: Record<string, unknown> }).rules ?? {};

  return Object.entries(rules)
    .filter(([rule]) => rule.startsWith("jsx-a11y/"))
    .filter(([, setting]) => {
      const level = Array.isArray(setting) ? setting[0] : setting;
      return level !== "off" && level !== 0;
    })
    .map(([rule]) => rule);
}

/**
 * Memoizado de propósito. `calculateConfigForFile` resolve a flat config
 * inteira (eslint-config-next, typescript-eslint, os plugins) e leva ~3s a
 * frio; chamar uma vez por caso dobrava isso e estourava o `testTimeout`
 * padrão de 5s quando a suíte roda em paralelo -- vermelho por orçamento, não
 * por defeito. Uma Promise no escopo do módulo faz os dois casos dividirem
 * um único cálculo.
 */
let cachedRules: Promise<string[]> | null = null;

function enabledA11yRules(): Promise<string[]> {
  return (cachedRules ??= resolveA11yRules());
}

// Mesmo dividido, o cálculo único ainda é lento perto do resto da suíte. O
// orçamento é do arquivo, não global: subir o `testTimeout` do projeto
// esconderia lentidão de verdade em qualquer outro teste.
describe("configuração de a11y do ESLint", { timeout: 30_000 }, () => {
  it("liga o ruleset recomendado do jsx-a11y", async () => {
    // O `recommended` do 6.10.2 traz 34 entradas, das quais 31 ficam
    // ligadas (3 vêm como "off" no próprio recommended). O core-web-vitals
    // do Next sozinho liga 6. Um piso de 30 detecta a config sendo removida
    // sem quebrar a cada release que ajusta uma regra.
    expect((await enabledA11yRules()).length).toBeGreaterThanOrEqual(30);
  });

  it("cobre as regras que o Next sozinho não liga", async () => {
    const rules = await enabledA11yRules();

    expect(rules).toContain("jsx-a11y/anchor-is-valid");
    expect(rules).toContain("jsx-a11y/label-has-associated-control");
    expect(rules).toContain("jsx-a11y/no-autofocus");
    expect(rules).toContain("jsx-a11y/click-events-have-key-events");
    expect(rules).toContain("jsx-a11y/interactive-supports-focus");
  });
});
