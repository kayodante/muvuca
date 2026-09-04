# Política de Segurança — Muvuca

O Muvuca leva a segurança e o isolamento de dados dos usuários a sério. Este
documento descreve como reportar uma vulnerabilidade e o escopo do modelo de
ameaças do projeto.

## Versões suportadas

Apenas a branch `main` recebe correções de segurança ativas.

## Como reportar uma vulnerabilidade

Não abra uma issue pública para relatar uma vulnerabilidade de segurança.
Em vez disso, use o recurso de **Security Advisories** do GitHub neste
repositório (aba Security → Report a vulnerability), ou envie um email
detalhado para o mantenedor do projeto.

Inclua no relatório:

1. Descrição da vulnerabilidade e impacto potencial.
2. Componente/arquivo afetado (URL, endpoint, Server Action, migration).
3. Passos de reprodução (proof of concept).
4. Cenário de ameaça: como um atacante exploraria isso na prática.
5. Sugestão de mitigação, se houver.

Pesquisadores que atuarem de boa-fé — respeitando a privacidade dos
usuários, sem destruir dados, sem degradar o serviço — não sofrerão medidas
legais pelo projeto.

## Escopo do modelo de ameaças

### No escopo

- **Bypass de Row Level Security (RLS)** — qualquer cenário em que o
  Usuário A leia, crie, altere ou exclua itens/tags do Usuário B.
- **Server-Side Request Forgery (SSRF)** — qualquer vetor que force o
  servidor a fazer uma requisição de rede para uma URL de usuário fora do
  pipeline de `lib/metadata/`, ou que contorne os controles desse pipeline
  (alcançar rede privada/metadata de nuvem, escapar do teto de redirects,
  seguir um IP diferente do validado).
- **Injeção de SQL** — interpolação de string em query, ou falha de
  parametrização em qualquer RPC.
- **Cross-Site Scripting (XSS)** — execução de script via dado salvo
  (título, prompt, bookmark importado).
- **Falhas de autenticação/sessão** — bypass no fluxo de Magic Link + PKCE,
  manipulação de cookie sem verificação de claims, ou desvio de
  `requireUser()`.
- **Open redirect** — manipulação do parâmetro de retorno pós-login para
  redirecionar a um domínio externo arbitrário.
- **Bypass de Content Security Policy** — execução de script inline sem o
  nonce da requisição.

### Fora de escopo

- Engenharia social, phishing ou spam contra usuários.
- DDoS volumétrico dependente só da infraestrutura de hospedagem.
- Ataques que dependam de acesso físico ou comprometimento total do
  dispositivo do cliente.
- Relatório automatizado de scanner sem prova de conceito funcional.

## Pilares de segurança do projeto

1. **SSRF contido em `lib/metadata/`**: o backend só faz fetch para URLs de
   usuário através desse módulo, sob allowlist de protocolo, bloqueio de
   IP privado/metadata de nuvem (`net.BlockList` + `lookup` customizado
   validando o IP no connect), revalidação de cada redirect, timeout e teto
   de bytes. Fora desse módulo, a proibição de fetch server-side é absoluta.
2. **RLS deny-by-default**: o papel `anon` não tem nenhum privilégio em
   tabela privada; acesso é concedido só ao papel `authenticated`, com
   `(select auth.uid()) = user_id` em toda policy.
3. **Chaves estrangeiras compostas**: relações entre tabelas exigem
   paridade de `user_id`, tornando associação cross-user impossível também
   no nível relacional, não só via RLS.
4. **CSP com nonce criptográfico por request**: gerado em `proxy.ts`, com
   `strict-dynamic` e sem script inline nem `unsafe-eval` em produção.
5. **Magic Link + PKCE com `getClaims()`**: validação criptográfica local do
   JWT contra o JWKS do projeto, nunca dependendo só do cookie de sessão.
6. **Zero chave privilegiada no runtime**: nenhuma `service_role` ou
   `sb_secret_*` é usada pelo servidor Next.js ou exposta ao cliente.
7. **Supply-chain**: dependências com quarentena de release
   (`minimumReleaseAge` no pnpm), bloqueio de subdependência exótica, e
   verificação automatizada de higiene do repositório em CI (veja
   `scripts/check-repo-hygiene.mjs`).

Mais detalhes de arquitetura em [`docs/ARQUITETURA.md`](./docs/ARQUITETURA.md).
