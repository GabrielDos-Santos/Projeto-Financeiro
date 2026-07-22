---
description: Investiga e corrige um bug com causa raiz, verificação completa e roteiro de teste manual
argument-hint: descreva o problema (o que você fez, o que esperava, o que aconteceu)
---

Corrija um bug no FinApp.

Relato do usuário: $ARGUMENTS

## Fluxo obrigatório

1. **Entenda antes de mexer.** Se o relato não disser (a) onde acontece (qual tela/ação), (b) o que era esperado e (c) o que acontece de fato, PERGUNTE. Peça a mensagem de erro ou print se houver.
2. **Descarte primeiro as causas de ambiente.** Antes de acusar o código, verifique se não é uma das pendências conhecidas do `CHANGELOG.md`:
   - **Migration não aplicada** — o sintoma clássico é erro do Postgres: `relation ... does not exist`, `column ... does not exist` ou `42501 / permission denied for table X` (falta de `GRANT`, decisão 24). As migrations `0010`–`0017` podem estar pendentes de `npx supabase db push`.
   - **Dado que "sumiu" para um usuário** — em geral é RLS funcionando como projetado (escopo por usuário / família), não bug.
   - **Env var faltando** (VAPID, `CRON_SECRET`, chaves do Supabase).
   Se for um desses, explique ao usuário o que ele precisa rodar/configurar em vez de mudar código.
3. **Localize a causa raiz e explique-a (para você mesmo) antes de editar.** Não corrija sintoma. Siga o caminho do dado: tela (`src/app/(app)/`) → componente (`src/features/<f>/components/`) → leitura (`queries.ts`) ou escrita (`actions.ts`) → schema Zod (`schemas.ts`) → view/tabela no Postgres (`supabase/migrations/`). Se o valor já chega errado no `queries.ts`, o problema é banco/SQL, não React.
4. **Corrija com a menor mudança possível.** Não refatore nada não relacionado no mesmo passo. Não mude comportamento além do que o usuário pediu.
5. **Verifique.** `npm run typecheck && npm run lint && npm run build` — tudo verde.
6. **Entregue um roteiro de teste manual.** Como não há testes automatizados, a prova da correção é o usuário conseguir reproduzir: passo a passo numerado, com o resultado esperado em cada passo (incluindo o caso que estava quebrado).

## Guardrails

- Se a correção "precisar" violar uma decisão fechada do `CHANGELOG.md`, PARE e explique o impasse ao usuário — as decisões é que mandam.
- **Dinheiro é sempre `BIGINT` de centavos** (decisão 1). Se a conta está errada por 1 centavo ou por 100x, suspeite de conversão — o lugar certo é `src/lib/money.ts`, nunca `float` no meio do caminho.
- **Datas trafegam como string `"YYYY-MM-DD"`** (decisão 30). Bug de "aparece um dia antes" é quase sempre `new Date("YYYY-MM-DD")` (interpreta como UTC) — a conversão só pode acontecer em `src/lib/dates.ts`.
- Nunca afrouxe um schema Zod para o erro sumir: o schema está avisando que o dado real não é o que o código espera. Ache por que o dado veio diferente.
- Nunca engula erro com `try/catch` vazio ou só `console.error` — Server Action retorna `fail(mensagem)` de `@/lib/action-result`, e a tela mostra isso ao usuário (toast/`fieldErrors`).
- Nunca contorne a RLS usando `SUPABASE_SERVICE_ROLE_KEY` para "resolver" um problema de permissão. A chave de service role só existe onde já está (job de cron) e NUNCA com prefixo `NEXT_PUBLIC_`.
- Nunca edite `src/types/database.ts` (é gerado) nem uma migration já aplicada — correção de banco vira migration NOVA, com o próximo número da sequência.

## Ao terminar

Explique em linguagem simples: qual era a causa do problema, o que foi mudado (com os arquivos), e o roteiro de teste manual para conferir no navegador (`npm run dev`). Se a correção envolveu migration nova, avise que ela precisa de `npx supabase db push` (e `npm run db:types`, se mudou colunas).
