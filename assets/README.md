# assets/

Arquivos-**fonte** de design. Esta pasta **não** é servida pelo Next.js (só
`public/` é), então nada aqui vai para o deploy.

## `icon-master.png`

Arte original do ícone do app (1024×1024, moeda com gráfico ascendente).
Gerada por IA e já com a marca d'água do gerador removida.

Dela saem os 5 arquivos de `public/icons/`, em duas variantes:

| Variante     | Arquivos                                | Moeda ocupa |
| ------------ | --------------------------------------- | ----------- |
| `any`        | `icon-512`, `icon-192`, `icon-180`      | 85%         |
| `maskable`   | `icon-maskable-512`, `icon-maskable-192`| **75%**     |

**Por que as maskable são reenquadradas, e não só reduzidas:** o Android
recorta o ícone adaptativo num círculo de ~80% do quadro. Com a moeda em 85%
o aro externo seria decepado. Reduzir para 75% coloca a arte inteira dentro
da zona segura. Por isso a maskable é um recorte-e-recomposição, não um
simples `resize` da versão normal.

Outras regras seguidas na geração:

- **Sem cantos arredondados** na arte — quem arredonda é o sistema operacional
  (arredondar aqui daria canto duplo no iOS).
- **Sem canal alpha**: ícone de app é opaco; o fundo `rgb(10, 11, 15)` casa com
  o `background_color`/`theme_color` do `src/app/manifest.ts`.
- Fundo sangra até a borda (full-bleed), em todas as variantes.

Para regerar depois de trocar a arte, basta repetir esses parâmetros — o
processo usa `sharp` (não é dependência do projeto; foi instalado à parte).
