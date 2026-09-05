# Pull Request

## Resumo

<!-- Explique em poucas linhas o que este PR muda e por quê. -->

## Tipo de mudança

- [ ] Feature
- [ ] Correção de bug
- [ ] Refatoração
- [ ] Testes
- [ ] Documentação
- [ ] CI / infraestrutura
- [ ] Outro

## O que mudou

<!-- Liste as principais alterações de forma objetiva. -->

-

## Como validar

<!-- Descreva os comandos e/ou passos manuais usados para validar a alteração. -->

```bash
# Exemplo:
pnpm check
```

## Evidências visuais

<!-- Para mudanças de UI, inclua screenshots, GIFs ou vídeo. Remova esta seção se não se aplicar. -->

## Checklist

- [ ] A alteração respeita o escopo definido em `CONTRIBUTING.md`.
- [ ] Não incluí segredos, tokens, credenciais ou dados pessoais no código, logs ou commits.
- [ ] `pnpm check` passa localmente.
- [ ] Adicionei ou atualizei testes quando houve mudança de comportamento.
- [ ] Elementos interativos novos ou alterados têm rótulo acessível, foco visível e navegação por teclado, quando aplicável.
- [ ] Entradas processadas no servidor são validadas com Zod, quando aplicável.
- [ ] Alterações de banco mantêm RLS restritiva e têm teste de isolamento entre usuários, quando aplicável.
- [ ] Nenhuma URL fornecida por usuário é requisitada no servidor fora de `lib/metadata/`.
- [ ] `pnpm exec supabase test db` passa quando migrations, RLS, triggers, constraints ou RPCs foram alterados.
- [ ] `pnpm test:e2e` passa nos fluxos críticos afetados, quando aplicável.
- [ ] Atualizei a documentação quando a mudança altera setup, arquitetura, segurança ou comportamento público.

## Observações

<!-- Riscos conhecidos, trade-offs, decisões importantes ou pontos para revisão. -->
