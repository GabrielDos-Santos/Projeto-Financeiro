---
description: Explica qualquer parte do projeto em linguagem simples, sem jargão, para quem não é dev
argument-hint: o que você quer entender (ex. "como funciona o cálculo da fatura do cartão", "o que é o arquivo queries.ts")
---

Explique o tema abaixo para uma pessoa que NÃO é desenvolvedora, em português claro.

Tema: $ARGUMENTS

## Onde procurar

- Código em `src/` — features em `src/features/<feature>/`, telas em `src/app/(app)/`, regras puras em `src/services/` e `src/lib/`.
- Banco em `supabase/migrations/` (SQL) e `src/types/database.ts` (tipos gerados).
- Contexto e decisões: `CHANGELOG.md` (estado atual + lista de decisões fechadas), `docs/ARQUITETURA.md`, `docs/ARQUITETURA-EXPANSAO*.md`, `docs/DER.mermaid`.

## Regras da explicação

1. **Leia o código de verdade antes de explicar** — não responda de memória. Cite os arquivos envolvidos (com caminho clicável) para quem quiser se aprofundar.
2. **Linguagem simples.** Evite jargão; quando um termo técnico for inevitável (ex.: "RLS", "Server Action", "migration"), explique-o em uma frase na primeira vez que aparecer. Use analogias do dia a dia quando ajudar.
3. **Estruture do geral para o específico:** primeiro "o que isso faz e por que existe", depois "como funciona por baixo", por último os detalhes.
4. **Se houver uma decisão fechada por trás, cite o número.** Muito comportamento "estranho" do sistema é proposital e está explicado no `CHANGELOG.md` (ex.: dinheiro guardado em centavos, saldo calculado e não armazenado, compra em cartão que conta no relatório na data da compra mas no saldo só quando a fatura é paga). Diga qual decisão explica o quê.
5. **Seja honesto sobre limites.** Se algo depende de configuração externa (Supabase, Vercel, chaves VAPID) ou de uma migration que ainda não foi aplicada, diga isso — várias migrations estão pendentes de `db push`.
6. **Não mude nada.** Este comando é só leitura e explicação. Se a pessoa quiser mudar algo depois, indique o comando certo (`/nova-feature`, `/nova-tela`, `/corrigir`).
7. Se o tema for amplo demais (ex.: "explica tudo"), proponha um roteiro em partes e pergunte por onde começar.
