# CHANGELOG.md — Sistema Financeiro Pessoal

> Este arquivo é o registro de progresso do projeto. Cole-o (junto com `docs/ARQUITETURA.md` e `docs/DER.mermaid`) no início de qualquer nova sessão de IA — ele diz exatamente onde o projeto parou.

---

## Estado atual

**Fase concluída:** Fase 0 — Fundação (código pronto, build verde).
**Próxima fase:** Fase 1 — Auth + shell (ver `docs/ARQUITETURA.md`, seção 11 — Roadmap).
**Pendências de conta do usuário (bloqueiam o critério "deploy acessível" da Fase 0 e os testes reais da Fase 1):**

1. Criar o repositório no GitHub e fazer o primeiro push (comandos no `README.md`).
2. Criar o projeto no Supabase e preencher o `.env.local` (o `git init` local já foi feito; o projeto Supabase ainda não existe).
3. Importar o repositório na Vercel com as variáveis de ambiente.

---

## O que já existe

| Arquivo                                                                                                                           | Conteúdo                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/ARQUITETURA.md`                                                                                                             | Documento completo de arquitetura (aprovado): decisões D1–D8, modelagem (13 tabelas + enums + views + funções + RLS), auth, páginas, componentes, segurança, performance, roadmap 0–14 |
| `docs/DER.mermaid`                                                                                                                | Diagrama entidade-relacionamento completo                                                                                                                                              |
| Projeto `finapp/`                                                                                                                 | Fundação instalada — ver detalhes da Fase 0 abaixo                                                                                                                                     |
| Todas as decisões de arquitetura foram **revisadas e aprovadas** pelo usuário. Não replanejar do zero — continuar a partir delas. |

---

## Decisões já fechadas (não reabrir sem necessidade)

1. Dinheiro sempre em `BIGINT` de centavos (nunca float).
2. Saldo de conta é **derivado** das transações pagas (não armazenado).
3. Transferência = par espelhado de transações (`transfer_group_id`).
4. Parcelamento = 1 transação-mãe + N linhas em `transaction_installments`.
5. Cartão de crédito: relatórios/orçamentos por **competência** (data da compra), saldo de conta por **caixa** (data do pagamento da fatura).
6. Recorrências materializadas por job diário (`pg_cron`), idempotente.
7. RLS habilitada em 100% das tabelas + Storage.
8. Server Components por padrão; TanStack Query nas superfícies interativas (lista de transações com infinite scroll); mutações sempre via Server Actions validadas com Zod.
9. _(Fase 0)_ Base de cor do shadcn: **zinc**, dark como tema padrão (classe `dark` no `<html>`; ThemeProvider na Fase 1, preferência por usuário na Fase 13).
10. _(Fase 0)_ `npm run build` sem Turbopack (estável na Vercel); Turbopack apenas no `dev`.
11. _(Fase 0)_ Fontes Geist via pacote npm `geist` (self-hosted pela Vercel), em vez de `next/font/google` — build reprodutível, sem fetch de rede em build-time.

---

## Roadmap — status por fase

| #   | Fase                                                                     | Status                                                                                         |
| --- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 0   | Fundação (repo, Next 15, Tailwind, shadcn, Supabase CLI, deploy inicial) | ✅ código concluído em 16/07/26 — deploy pende de ações de conta do usuário (ver Estado atual) |
| 1   | Auth + shell (login, cadastro, middleware, layout)                       | ⬜ não iniciada                                                                                |
| 2   | Banco completo (migrations, RLS, views, seed)                            | ⬜ não iniciada                                                                                |
| 3   | Contas + Categorias                                                      | ⬜ não iniciada                                                                                |
| 4   | Transações (core)                                                        | ⬜ não iniciada                                                                                |
| 5   | Parcelamentos                                                            | ⬜ não iniciada                                                                                |
| 6   | Cartões + Faturas                                                        | ⬜ não iniciada                                                                                |
| 7   | Recorrentes                                                              | ⬜ não iniciada                                                                                |
| 8   | Dashboard (fim do MVP)                                                   | ⬜ não iniciada                                                                                |
| 9   | Orçamentos + alertas                                                     | ⬜ não iniciada                                                                                |
| 10  | Metas                                                                    | ⬜ não iniciada                                                                                |
| 11  | Relatórios + export                                                      | ⬜ não iniciada                                                                                |
| 12  | Pesquisa global (⌘K)                                                     | ⬜ não iniciada                                                                                |
| 13  | Configurações                                                            | ⬜ não iniciada                                                                                |
| 14  | Polimento                                                                | ⬜ não iniciada                                                                                |

---

## Fase 0 — Fundação (16/07/26)

**Versões instaladas:** Next.js 15.5.20 · React 19.1.0 · Tailwind v4 · TypeScript 5 · Supabase CLI 2.109.1 (devDependency).
**Criado/configurado:**

- Projeto Next 15 (App Router, `src/`, alias `@/*`, ESLint, Turbopack no dev). Script `build` alterado para `next build` sem Turbopack (build estável na Vercel).
- TypeScript estrito reforçado: `noUncheckedIndexedAccess: true` no `tsconfig.json`.
- ESLint: `@typescript-eslint/no-explicit-any: "error"`, `no-unused-vars` com padrão `_`, `eslint-config-prettier` por último.
- Prettier + `prettier-plugin-tailwindcss` (`.prettierrc`, `.prettierignore`); scripts `format`, `format:check`, `typecheck`.
- shadcn/ui inicializado (**manualmente** — o registro `ui.shadcn.com` era inacessível na rede do ambiente da sessão; resultado idêntico ao `init`): `components.json` (new-york, base zinc, css variables, RSC), tokens light+dark em `src/app/globals.css` (Tailwind v4, `@custom-variant dark`, oklch), `src/lib/utils.ts` com `cn()`. Deps: class-variance-authority, clsx, tailwind-merge, lucide-react, tw-animate-css. Nas próximas fases os componentes de `components/ui` chegam versionados no repo (equivalente a `npx shadcn add …`).
- Dependências da stack instaladas: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query`, `recharts`.
- Estrutura de pastas feature-based completa (`src/features/*` com 12 domínios, `components/{ui,layout,shared,charts}`, `hooks`, `lib/supabase`, `services/export`, `types`) com `.gitkeep`.
- Supabase CLI: `supabase/config.toml` (`npx supabase init`, project_id `finapp`) + `supabase/migrations/` vazio (migrations entram na Fase 2). Script `db:types` pronto no `package.json`.
- `.env.example` (URL, anon key, service role — só servidor, `NEXT_PUBLIC_SITE_URL`); `.gitignore` ajustado (`!.env.example`, temporários da CLI).
- Layout raiz em pt-BR com fontes Geist (pacote `geist`, embutido) e classe `dark`; página inicial placeholder da Fase 0.
- `README.md` com passos de setup (GitHub, Supabase, Vercel) e scripts; `docs/ARQUITETURA.md` e `docs/DER.mermaid` versionados no repo.
- Git inicializado localmente (`git init -b main`) — primeiro commit fica para o usuário (autoria própria).
  **Verificado:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run build` ✅ (build verde).

---

## Instrução para a próxima sessão de IA

> Você está continuando um projeto já arquitetado e aprovado. Leia `docs/ARQUITETURA.md` e `docs/DER.mermaid` antes de qualquer coisa — não replaneje a stack, a estrutura de pastas ou a modelagem do banco, pois já foram decididas e aprovadas pelo usuário. Consulte a tabela de status acima para saber qual fase implementar a seguir (**próxima: Fase 1 — Auth + shell**; ela pressupõe que o usuário já criou o projeto Supabase e preencheu o `.env.local` — se ainda não criou, oriente-o primeiro). Siga o protocolo já combinado: implemente uma funcionalidade por vez, verifique se compila, explique o que foi criado, informe os próximos passos e aguarde confirmação antes de continuar. Ao final da fase, atualize este `CHANGELOG.md` (marque a fase como concluída e liste os arquivos criados/alterados) para que o usuário possa levar o estado atualizado para outra sessão, se necessário.

---

## Histórico de atualizações deste changelog

- **[16/07/26]** — Fase 0 concluída (código + build verde). Pendências de conta listadas em "Estado atual". Próxima: Fase 1.
- **[16/07/26]** — Criado. Estado inicial: arquitetura aprovada, nenhum código escrito.
