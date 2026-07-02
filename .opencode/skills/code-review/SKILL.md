---
name: code-review
description: Use when the user runs /code-review or asks for a code review after implementation (post-Apply). Focused on implementation quality — architecture, code quality, robustness, performance, security, consistency — before functional validation or UX review. Trigger after any OpenSpec Apply, when the user says "revisar implementação", "code review", "revisão de código", "olha o que fiz", "review my changes", or when wrapping up implementation work. This skill is the gate before ux-review and qa-review.
---

# Code Review — Post-Apply Implementation Review

Revisão de implementação concluída após o Apply de uma OpenSpec change. O objetivo é identificar problemas de arquitetura, manutenção, robustez e qualidade do código **antes** da validação funcional e dos reviews de UX/QA.

Esta skill é específica para o **Spot Pricing System (LIVOLTEK Brasil)**.

## Princípios

- **Reduzir dívida técnica** — cada problema não identificado aqui custa mais caro depois
- **Antecipar riscos futuros** — um método complexo hoje é uma regressão amanhã
- **Garantir consistência** — o código novo deve parecer que sempre esteve no projeto

## Fluxo de trabalho

A revisão segue 3 fases obrigatórias nesta ordem:

1. **Contexto** — entender o que foi implementado e quais arquivos mudaram
2. **Análise** — percorrer as 7 áreas de verificação
3. **Relatório** — produzir o relatório completo com classificação de riscos

---

## Fase 1: Contexto

Antes de analisar, entenda o que mudou.

1. Identifique a change alvo:
   - Se `$ARGUMENTS` foi passado, use como nome da change
   - Se vazio, use a change mais recente em `openspec/changes/` (ou `archive/`), ou o que está sendo discutido no contexto
   - Se ainda assim ambíguo, pergunte ao usuário

2. Leia os documentos de contexto relevantes:
   - **`AGENTS.md`** — regras e arquitetura do projeto
   - **`docs/prd.md`** — requisitos funcionais da change
   - A **`tasks.md`** e **`design.md`** da change em `openspec/changes/<change>/`

3. Capture o diff:
   ```bash
   git diff HEAD~1 --stat   # visão geral dos arquivos alterados
   git diff HEAD~1          # diff completo
   ```
   Se a change tem múltiplos commits, use `git log --oneline -5` para entender o histórico. O escopo da revisão é o código alterado **nesta change**.

4. Entenda **o que** cada arquivo faz e **por que** foi alterado — não apenas o diff técnico, mas a intenção.

---

## Fase 2: Análise

Percorra cada área deliberadamente. Em cada uma, leia o código alterado e avalie os pontos indicados.

Você pode pular uma área se ela não for relevante para a mudança (ex: uma change de CSS não precisa de revisão de segurança). Mas justifique por que pulou.

### 1. Arquitetura

Validar aderência ao que está definido em `AGENTS.md` e `design.md` da change.

Identificar:
- Violações da arquitetura definida
- Quebra de separação de responsabilidades (ex: lógica de cálculo vazando pra UI)
- Acoplamento excessivo entre módulos
- Dependências desnecessárias adicionadas
- Componentes excessivamente grandes (um arquivo fazendo coisa demais)
- Duplicação de lógica existente — código que já existe em outro lugar e foi reimplementado

Para o Spot Pricing System, a arquitetura esperada é:
- **Motor de cálculo**: funções puras em `src/engine/`, separadas da UI, testáveis isoladamente
- **UI**: componentes React em `src/components/`, sem lógica de negócio
- **Estado**: Redux Toolkit para estado global (`src/store/`)
- **Dados**: Supabase para persistência (`src/services/`)

### 2. Qualidade do Código

Identificar:
- Métodos excessivamente longos (>30 linhas é um sinal amarelo, >60 é vermelho)
- Complexidade desnecessária (aninhamento profundo, mutações estranhas, lógica emaranhada)
- Código duplicado (copiou e colou algo que poderia ser reutilizado)
- Nomes inadequados de variáveis, funções, componentes
- Estruturas difíceis de compreender — se você precisou reler 3x para entender, está sinalizado
- Código morto ou não utilizado (imports não usados, variáveis declaradas e não lidas, branches inalcançáveis)
- Comentários que explicam **o que** em vez de **por que** — o código deveria ser autoexplicativo
- Ausência de tipos TypeScript onde seriam benéficos

### 3. Robustez

Identificar:
- Falta de tratamento de erros (especialmente em chamadas a APIs, Supabase queries, parsers)
- Fluxos alternativos não contemplados (e se o usuário cancelar? e se voltar? e se repetir?)
- Casos extremos ignorados (valores vazios, zero, nulos, negativos, strings vazias, arrays vazios)
- Possíveis falhas de execução (acesso a propriedade de undefined, falta de optional chaining)
- Dependência excessiva de comportamento implícito (confiar que algo sempre existe sem verificar)

Para o Spot Pricing System, atenção especial a:
- Pesos zerados, quantidades zeradas, valores FOB zerados
- Cálculo com apenas 1 item (divisão por um)
- Benefícios ON/OFF simultâneos
- Percentuais que somam mais que 100%
- Operações com null/undefined antes de dados serem carregados

### 4. Performance

Identificar:
- Loops desnecessários ou aninhados em dados que podem crescer
- Processamentos redundantes (recalcular algo que já foi calculado)
- Consultas ineficientes ao Supabase (SELECT * quando precisa de colunas específicas, N+1 queries)
- Renderizações excessivas no React (estado muito alto na árvore, sem memoização quando necessário)
- Carregamentos desnecessários de dados ou componentes
- Operações síncronas pesadas que deveriam ser async

### 5. Segurança

Identificar:
- Falta de validação de entrada (inputs de formulário sem sanitização)
- Exposição indevida de dados (dados sensíveis no frontend que deveriam ficar no backend)
- Permissões inadequadas (RLS policies faltando ou incorretas no Supabase)
- Dados sensíveis manipulados incorretamente (senhas, tokens, API keys)
- SQL injection potencial em queries dinâmicas

No Spot Pricing System, dados sensíveis incluem: valores de simulação, margens, custos, configurações de markup. Verifique RLS nas migrations do Supabase.

### 6. Consistência

Identificar:
- Padrões diferentes para resolver o mesmo problema (ex: um lugar usa arrow function, outro usa function declaration para o mesmo propósito)
- Estruturas incompatíveis com o restante do projeto (ex: Tailwind CSS numa base que só usa CSS Modules — mas este projeto não usa Tailwind)
- Convenções quebradas:
  - Nomenclatura de componentes React: PascalCase
  - Arquivos: kebab-case para páginas, PascalCase para componentes
  - Caminhos de importação: relativos dentro do módulo, absolutos (@/) para cross-module
- Divergências em formatação de moeda/percentual: `R$ 1.234,56` e `9,65%` (formato brasileiro)
- Cores que fogem da paleta LIVOLTEK:
  - `--color-livoltek-blue: #008BF7`
  - `--color-livoltek-green: #00D084`
  - Paleta completa em `src/styles/variables.css`

### 7. Riscos

Classificar cada risco encontrado:
- **Alto Risco** — falha funcional relevante, possível perda de dados, regressão grave
- **Médio Risco** — impacto limitado, pode causar comportamento inesperado em cenários específicos
- **Baixo Risco** — cosmético, impacto mínimo, aceitável para agora

Apontar:
- Possíveis problemas futuros baseados na trajetória do código
- Trechos frágeis — código que "funciona por coincidência" ou depende de invariantes frágeis
- Complexidade excessiva que vai dificultar manutenção
- Pontos de atenção — lugares que você não consegue validar completamente sem o sistema rodando

---

## Fase 3: Relatório

Produza o relatório usando **exatamente** esta estrutura. Seja direto — sem introduções, sem pontos positivos, sem descrições longas.

### Resumo

Tabela única com todos os problemas encontrados, ordenados por severidade:

| # | Risco | Problema | Ação | Arquivo |
|---|-------|----------|------|---------|
| 1 | Alto | Título curto do problema | Ação recomendada | `Arquivo.ts:linha` |
| 2 | Médio | ... | ... | ... |

Cada linha deve ser auto-contida — o usuário deve entender o problema e a ação sem precisar ler explicações adicionais.

### Conclusão

Exatamente uma linha:

> **Archive** — código adequado, pode seguir para UX/QA
> **Corrige** — requer ajustes antes do UX/QA

---

## Armadilhas a evitar

| Racionalização | Por que está errada |
|----------------|---------------------|
| "Só uma mudança pequena, não precisa revisar" | Mudanças pequenas frequentemente quebram invariantes sutis. Revise do mesmo jeito. |
| "Funciona no meu teste, está ok" | Teste manual não cobre edge cases. A revisão existe para pegar o que o teste não pegou. |
| "O autor é senior, confio no código" | Todo mundo comete erros. A revisão não é sobre desconfiança, é sobre ter um segundo par de olhos. |
| "Vou revisar rápido, já vi o que faz" | A pressa faz você pular detalhes importantes. Siga as 7 áreas sistematicamente. |
| "Já vai passar pelo QA, eles pegam" | QA valida comportamento, não qualidade do código. Dívida técnica não é problema do QA. |
| "Vou listar só os problemas óbvios" | O valor está em achar problemas não-óbvios. Se é óbvio, o autor já teria visto. |

Se após percorrer as 7 áreas você não encontrar problemas relevantes, diga explicitamente que a implementação está adequada — mas só depois de ter analisado cada área com esforço real.
