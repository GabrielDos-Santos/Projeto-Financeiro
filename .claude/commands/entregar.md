---
description: Verifica tudo, cria branch, faz commit convencional e abre o Pull Request
argument-hint: opcional — resumo do que foi feito (se não passar, será deduzido do diff)
---

Prepare e entregue o trabalho atual como um Pull Request.

Contexto do usuário (opcional): $ARGUMENTS

## Fluxo obrigatório

1. **Confira o que existe para entregar.** `git status` e `git diff` — se não houver mudanças, avise e pare. Revise o diff: se houver arquivo que não deveria ir, AVISE o usuário antes de prosseguir. Nunca commite:
   - `.env.local` ou qualquer arquivo com segredo real (`VAPID_PRIVATE_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`). Mudança de env var vai no `.env.example` **com valor de exemplo**, nunca o valor real.
   - Arquivos temporários, `.rar`/`.zip`, dumps, screenshots soltos.
2. **Portão de qualidade.** `npm run typecheck && npm run lint && npm run build` — TUDO verde antes de qualquer commit. Se falhar, corrija primeiro (fluxo do `/verificar`). Nunca commite com o portão vermelho.
3. **Atualize o `CHANGELOG.md`** se a entrega fecha uma fase ou toma uma decisão nova: seção "Estado atual" (última fase concluída + próxima) e uma decisão numerada nova no fim da lista. Se a entrega criou migration, ela também entra na tabela "O que já existe" e nas "Pendências de conta do usuário" (com o que o usuário precisa rodar).
4. **Branch.** NUNCA commite direto na `main`. Se estiver na `main`, crie uma branch descritiva em kebab-case: `feat/<resumo>`, `fix/<resumo>`, `docs/<resumo>` ou `chore/<resumo>`.
5. **Commit.** Mensagem em [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`), descrição curta **em português**.
6. **Push e PR.** `git push -u origin <branch>` e abra o PR com `gh pr create` (base `main`). Título também em Conventional Commits; no corpo, descreva o que muda e como testar manualmente. **Se a entrega tem migration ou env var nova, o corpo do PR precisa dizer isso em destaque** — o deploy na Vercel não roda `db push` sozinho, e sem a env var o build pode subir quebrado.
7. Se o `gh` não estiver autenticado, dê ao usuário o link de comparação do GitHub para abrir o PR manualmente.

## Guardrails

- NUNCA use `git push --force`, `git reset --hard` nem reescreva histórico.
- NUNCA use `--no-verify` para pular hooks.
- Um PR = um assunto. Se o diff mistura duas coisas sem relação, sugira ao usuário dividir em dois PRs.
- Não faça merge do PR — quem aprova e faz merge é um humano.

## Ao terminar

Informe em linguagem simples: nome da branch, mensagem do commit, link do PR, e — se houver — o lembrete do que precisa ser feito fora do código (aplicar migration, adicionar env var na Vercel) antes de o deploy funcionar.
