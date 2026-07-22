---
description: Roda o portão de qualidade completo (typecheck, lint, build) e corrige o que estiver quebrado
---

Rode o portão de qualidade do FinApp e deixe tudo verde.

## Passos

1. Rode, nesta ordem, na raiz do repositório:
   - `npm run typecheck` (`tsc --noEmit`)
   - `npm run lint` (`eslint`)
   - `npm run build` (`next build`, sem Turbopack — decisão 10)
2. Se algo falhar, corrija e rode de novo — repita até tudo passar. Regras para as correções:
   - **Erro de tipo:** corrija o tipo de verdade. NUNCA use `any`, `@ts-ignore` ou `as unknown as X` para silenciar. Se o erro vier de `src/types/database.ts`, o banco e os tipos estão fora de sincronia — o certo é `npm run db:types` (depois de `npx supabase db push`), nunca editar o arquivo gerado à mão.
   - **Erro de lint:** NUNCA use `eslint-disable`. Se a regra reclama, o código está no lugar/formato errado — conserte a causa.
   - **Erro de formatação:** `npm run format` (Prettier + plugin do Tailwind).
   - **Erro só no `build` e não no `dev`:** quase sempre é Server/Client boundary — `"use client"` faltando, ou um Server Component importando algo que só existe no browser. Não jogue `"use client"` no topo de tudo para calar o erro; ache o componente certo.
3. Se a correção exigir decisão de produto (mudar comportamento que o usuário pediu), PERGUNTE ao usuário em vez de decidir sozinho.

## Guardrails

- Não existe suíte de testes automatizados neste projeto — o portão é typecheck + lint + build. Não invente `npm test`, não instale runner de teste sem o usuário pedir.
- Não "conserte" erro removendo funcionalidade ou comentando código.
- Não altere `src/types/database.ts` na mão (é gerado) nem migrations já aplicadas.

## Ao terminar

Relate em linguagem simples: o que estava quebrado, o que foi feito para consertar, e confirme que os três comandos passaram. Se estava tudo verde desde o início, diga apenas isso.
