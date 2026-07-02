---
name: ux-review
description: Use when the user runs /ux-review or asks for a UX/UI review after a Sprint — looking for visual inconsistencies, component mismatches, flow breaks, missing UI states (loading/empty/error), language inconsistencies, accessibility issues, and divergence from the LIVOLTEK design system defined in docs/design.md. Also trigger when the user asks to "review the UI", "check visual consistency", "review the design", "audit the interface", or says "look at the screenshots and tell me what's wrong". Do NOT use for code-level QA (use qa-review) or requirements review (use sdd-review).
---
# UX Review — LIVOLTEK Spot Pricing System

Revisão de experiência do usuário e consistência visual após conclusão de uma Sprint. O objetivo é validar o produto como um todo, não funcionalidades isoladas.

**Referência obrigatória:** Leia `docs/design.md` para conhecer os tokens de design, especificações de componentes, paleta de cores, tipografia e regras de layout do projeto.

## Checklist de Revisão

### 1. Consistência Visual

Compare o código e screenshots contra `docs/design.md`:

- **Cores**: Os tokens CSS usados nos componentes correspondem à paleta LIVOLTEK? (`--color-livoltek-blue: #008BF7`, `--color-livoltek-green: #00D084`, `--color-livoltek-dark: #102136`, etc.)
- **Tipografia**: Os componentes usam as fontes e escalas corretas? (`--font-title: 'Outfit'`, `--font-body: 'Inter'`, escala de 3 níveis: 13px/16px/24px)
- **Espaçamentos**: Os paddings e margins seguem a escala definida? (`--space-1` a `--space-12`)
- **Bordas e cantos**: Os border-radius seguem os tokens? (`--radius-sm: 8px`, `--radius-md: 12px`, `--radius-card: 24px`, `--radius-btn: 14px`)
- **Ícones**: Usam Lucide React com tamanhos consistentes? (18px default, 16px em tabelas, 20px em headers, stroke 1.5px)
- **Sombras**: Seguem os tokens? (`--shadow-sm`, `--shadow-md`, `--shadow-lg`)

Identificar:
- Componentes visualmente inconsistentes entre si
- Estilos diferentes para elementos equivalentes
- Quebras do Design System LIVOLTEK
- Variações desnecessárias (cores hardcoded em vez de tokens)

### 2. Consistência de Componentes

Comparar implementações de funcionalidades semelhantes:

- **Botões**: Ações equivalentes usam o mesmo estilo de botão? (primary azul, secondary outline, danger vermelho, eco verde)
- **Inputs**: Todos seguem o padrão de `input-field`? Labels, estados de erro, indicadores de override?
- **Cards**: Seguem o padrão glassmorphism? (`card-premium` com backdrop-filter, hover com translateY)
- **Tabelas**: Usam `data-table`? Header escuro, linhas alternadas, hover com bg-hover?
- **Modais**: Usam `dialog-overlay` com backdrop-filter e `dialog-content` com animação?
- **Badges**: Usam `badge` com as cores corretas? (draft=azul, completed=verde, unsaved=amarelo)
- **Toggles**: Seguem o padrão de `toggle` com knob deslizante?

Avaliar se componentes existentes poderiam ter sido reutilizados em vez de criar novos.

### 3. Consistência de Fluxos

Analisar se fluxos equivalentes se comportam da mesma forma:

- **Navegação**: Sidebar fixa 220px, breadcrumbs, header fixo 64px
- **Criação**: Modal overlay ou nova página?
- **Edição**: Inline ou modal? Comportamento de dirty state com indicador laranja?
- **Exclusão**: Confirmação com diálogo? Usa `btn-danger`?
- **Cancelamento**: Retorna ao ponto anterior sem perda de dados?

Identificar comportamentos diferentes para ações semelhantes em diferentes partes do sistema.

### 4. Estados da Interface

Identificar ausência de estados obrigatórios:

- **Loading**: Skeleton/spinner enquanto dados carregam
- **Sucesso**: Toast verde (`toast-success`) após operações bem-sucedidas
- **Erro**: Toast vermelho (`toast-error`) com mensagem clara
- **Vazio**: Ilustração + mensagem ("Crie sua primeira simulação") em listas vazias
- **Exceções**: Tratamento visual para falhas de API, timeouts, dados inconsistentes

Todo componente que busca dados deve ter pelo menos loading, empty e error states.

### 5. Consistência de Linguagem

Comparar textos entre funcionalidades:

- **Nomenclatura**: Os mesmos conceitos têm os mesmos nomes em toda a aplicação?
- **Mensagens**: Toast, tooltips, placeholders seguem o mesmo tom?
- **Formatação**: Números seguem o padrão brasileiro? (R$ #.###,##, percentual #,##%)
- **Tradução (i18n)**: Se aplicável, textos estão nos arquivos de locale corretos?
- **Tom**: Consistente — profissional, técnico, sem jargão desnecessário

Identificar nomenclaturas conflitantes, mensagens inconsistentes, textos ambíguos.

### 6. Acessibilidade

Verificar:

- **Contraste**: Textos têm contraste suficiente com o background? Especialmente nos modos light e dark
- **Labels**: Inputs, botões e ícones têm aria-labels ou labels visíveis?
- **Navegação por teclado**: Elementos interativos são focáveis? Tab order faz sentido?
- **Elementos inacessíveis**: Modais armadilham foco? Dropdowns funcionam com teclado?
- **Semântica**: Uso correto de landmarks (`<nav>`, `<main>`, `<header>`, roles ARIA)

### 7. Aderência ao Produto

Comparar a Sprint implementada com:

- `docs/design.md` — especificações de layout, componentes, identidade visual
- `docs/product-vision.md` — propósito do produto
- `docs/product-roadmap.md` — direção estratégica

Avaliar se todas as funcionalidades parecem pertencer ao mesmo produto LIVOLTEK.

## Classificação de Risco

| Risco | Critério |
|-------|----------|
| **Alto** | Quebra de consistência que afeta a experiência do usuário, impede fluxos, ou descaracteriza a identidade LIVOLTEK |
| **Médio** | Inconsistência visível que impacta a experiência ou identidade visual, mas tem correção localizada |
| **Baixo** | Detalhe menor, melhoria de acabamento, desvio cosmético do spec |

Todos os problemas encontrados devem ter sugestão de correção imediata, independente do risco. A classificação serve para priorizar a ordem das correções, não para adiar.

## Processo de Revisão

1. **Leia `docs/design.md`** — entenda os tokens, componentes e especificações
2. **Analise os arquivos-alvo** — código dos componentes modificados na Sprint
3. **Examine screenshots** — se o usuário forneceu, avalie visualmente contra as especificações
4. **Aplique o checklist** — percorra as 7 áreas sequencialmente
5. **Produza o relatório** — com a estrutura abaixo

## Relatório Final

Produza o relatório exatamente com esta estrutura:

### Resumo

- Sprint/feature revisada: [nome]
- Design System referência: docs/design.md
- Riscos: Alto: X / Médio: X / Baixo: X
- Verdicto: **Consistente** / **Requer ajustes**

### Pontos Positivos

Aspectos visuais e de UX que estão corretos e consistentes com o restante do produto.

### Problemas Encontrados

Numere cada problema sequencialmente para facilitar a referência cruzada com a tabela de Recomendações:

```
### [RISCO] N. Título do Problema

**Evidência:** Descrição objetiva com referência ao arquivo, linha, ou elemento na screenshot.

**Checklist violado:** [número do checklist — ex: "1 - Consistência Visual"]

**Impacto:** Consequência para o usuário ou identidade do produto.

**Sugestão:** Correção recomendada com referência ao token ou especificação em docs/design.md.
```

### Recomendações

Apresente como **tabela** para escaneabilidade rápida:

| # | Risco | Ação | Arquivo |
|---|-------|------|---------|
| 1 | Alto | Descrição da correção | `Componente.tsx:linha` |
| 2 | Alto | ... | ... |

Ordene por prioridade (Alto → Médio → Baixo). O `#` corresponde ao número do problema na seção anterior.

### Próximos Passos

Mantenha breve — apenas oriente o próximo passo, não redija a change. Esta seção existe para encaminhar, não para substituir o `/opsx-propose` (que fará o trabalho de estruturar a proposta):

> Com base nestas recomendações, sugiro criar um **OpenSpec change** para aplicar as correções. Use `/opsx-propose` para gerar uma proposta com as correções de Alto risco como tasks obrigatórias e Médio/Baixo como tasks opcionais.

### Conclusão

Responda:

**Esta Sprint mantém uma experiência consistente com o restante do produto?**

- **Sprint consistente** — todos os problemas são Baixo risco e podem ser corrigidos em paralelo
- **Requer ajustes** — existem problemas que precisam de correção antes da validação final
