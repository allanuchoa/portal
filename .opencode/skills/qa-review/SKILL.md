---
name: qa-review
description: Use when the user runs /qa-review or asks for a senior QA analysis of code changes — looking for functional defects, regressions, security flaws, performance issues, testability gaps, and operational risks. Also trigger when user mentions "revisão de qualidade", "QA review", "pronto para liberar", "release readiness", "sprint review", "qualidade da sprint", "análise de riscos", "homologação", or wants a thorough quality pass before declaring a release.
---

# QA Review — Sprint Release Readiness

Revisão técnica de QA sênior sobre uma Sprint concluída. O objetivo é garantir que a Sprint esteja pronta para entrega, avaliando o **comportamento completo do sistema** e não apenas funcionalidades isoladas.

Esta skill é específica para o **Spot Pricing System (LIVOLTEK Brasil)**.

## Fluxo de trabalho

A revisão segue 4 fases obrigatórias nesta ordem:

1. **Contexto** — entender o que a Sprint prometeu e o que mudou
2. **Execução** — rodar testes, analisar código, validar cenários
3. **Relatório** — produzir o relatório QA completo
4. **Correções** — apresentar plano de correções, aguardar aprovação, implementar

---

## Fase 1: Contexto

Leia na ordem:

1. **[AGENTS.md](.agents/AGENTS.md)** e **[CONTEXT.md](.agents/CONTEXT.md)** — regras e especificação do projeto
2. **[product-roadmap.md](docs/product-roadmap.md)** — Sprint tasks
3. **[product-vision.md](docs/product-vision.md)** — restrições determinísticas
4. **[prd.md](docs/prd.md)** — requisitos funcionais com critérios de aceite
5. **Changes da Sprint** em `openspec/changes/` (ou `archive/`). Cada Change tem `tasks.md` com o status.
6. **Código alterado**: `git log --oneline -<N>` e `git diff` desde o início da Sprint
7. **`docs/log-results.md`** — histórico de execuções de teste anteriores

Se a Sprint não estiver clara, **pergunte ao usuário** quais Changes compõem esta Sprint antes de prosseguir.

---

## Fase 2: Execução

Esta fase é ativa — você não apenas analisa, você **executa** testes e **valida** cenários.

### 2.1 Executar testes automatizados

Rode os testes e capture os resultados. Não apenas cite se existem testes — execute-os.

```bash
npm run test:unit    # Vitest — testes unitários do motor de cálculo
npm run test:e2e     # Playwright — testes de fluxo completo
```

Para cada suite, registre: suíte, total de testes, pass/fail/skip, duração, e detalhes de falhas. Compare com `docs/log-results.md` para detectar regressões — testes que passavam antes e agora falham.

Se houver falhas, analise a causa raiz de cada uma:
- `npm run test:unit -- --reporter verbose` para ver detalhes
- Leia o código do teste e o código sob teste para diagnosticar

### 2.2 Percorrer as 8 áreas de revisão

Percorra cada área deliberadamente. Em cada uma, **valide ativamente** — não apenas liste riscos. Para cada cenário que você identificaria como "recomendado para validação", valide-o ali mesmo:

- **Cenários alternativos**: execute mentalmente o fluxo com dados extremos; se o cálculo permitir, faça contas manuais para verificar
- **Edge cases**: verifique no código se estão tratados (ex: `src/engine/nationalization.ts` lida com peso zero?)
- **Integrações**: leia as queries Supabase e verifique RLS, tratamento de erro
- **Regressões**: identifique arquivos que mudaram e verifique se consumidores foram atualizados

#### 1. Requisitos

Cruze o que foi pedido (roadmap + PRD + tasks.md das Changes) com o que está implementado.

Identificar:
- Requisito não implementado
- Funcionalidade parcialmente implementada
- Critério de aceite do PRD não atendido
- Divergência entre a fórmula implementada e a planilha de referência (`docs/*.xlsx`)

Para o Spot Pricing System, preste atenção especial em:
- **Regras de rateamento** (apportionment): frete/port handling/AFRMM/frete rodoviário por **% peso**; seguro/SISCOMEX/despacho aduaneiro/seguro fora DI por **% valor FOB** — nunca misturar
- **Arredondamento**: 2 casas para moeda, 4 para percentuais; formato `R$ 1.234,56` e `9,65%`
- **Motor de cálculo** deve ser funções puras em `src/engine/`, separadas da UI

#### 2. Fluxos Funcionais

Execute mentalmente os fluxos completos da Sprint. Não valide funcionalidades isoladas — valide a cadeia inteira.

Identificar:
- Fluxo interrompido (create → fill → calculate → save → reopen → verify → export)
- Navegação incorreta entre rotas/páginas
- Estados inconsistentes (ex: simulação salva mas não recarrega, item editado sem persistir)
- Comportamentos inesperados em mudanças de input em tempo real

Avalie a jornada multi-device: salvar num contexto de browser, abrir em outro.

#### 3. Integrações

Analisar:
- **Supabase (PostgreSQL)**: queries, RLS, schemas, tipos
- **Serviços externos**: APIs (ex: NCM API)
- **Eventos / processamentos assíncronos**: jobs, real-time, webhooks
- **Persistência**: nunca somente localStorage — dados devem ir ao Supabase

Identificar:
- Query sem tratamento de erro
- Falha de RLS expõe dados de outro tenant/usuário
- Contrato de tipos TypeScript ≠ schema do banco
- Segredos/API keys hardcoded no frontend

#### 4. Cenários Alternativos

Para cada cenário abaixo, **valide** — não apenas identifique. Leia o código, execute contas, verifique branches de tratamento.

Validar:
- Campos vazios / valores inválidos / dados inexistentes
- Cancelamentos no meio de um fluxo
- Repetição de operações (duplo submit, duplo save)
- Concorrência (dois usuários editando a mesma simulação)
- Primeira execução (sem dados, sem permissão, sem config)
- Quantidades zero, peso zero, item único (edge cases do calculation engine)
- Todos os benefícios ON simultaneamente (ALL Benefits)
- 100% de deferral (diferimento ICMS)

#### 5. Regressões

Analisar se as funcionalidades implementadas podem afetar comportamentos já existentes.

Identificar:
- Fluxos existentes quebrados (motor de cálculo, DRE, sensibilidade, registro de produtos)
- Dependências afetadas por mudanças de schema ou tipos compartilhados
- Alterações com impacto indireto em fases anteriores já em produção (Phase 1–6)
- APIs internas alteradas sem atualizar consumidores

#### 6. Cobertura de Testes

Analise a cobertura real (não teórica):
- **Testes que executaram na etapa 2.1**: quais cenários eles cobrem?
- **Lacunas**: cenários críticos que não têm teste — cite arquivos e linhas específicas
- Testes de calculation engine devem ter fixture data da planilha como ground truth

#### 7. Robustez Técnica

Use conhecimento técnico do stack real do projeto para imaginar cenários capazes de provocar falhas.

Stack do projeto:
- **React 19** (componentes, hooks, estado)
- **Vite** (build — o projeto usa Vite, não Next.js)
- **CSS custom properties Livoltek** (NUNCA Tailwind)
- **Redux Toolkit** (@dnd-kit, recharts, jspdf)
- **Supabase** (auth, RLS, realtime, PostgreSQL)
- **Playwright** e **Vitest** (testes)
- **Radix UI** (acessibilidade, componentes headless)

Verifique identidade visual Livoltek:
- Cores da paleta (`--color-livoltek-blue: #008BF7`, `--color-livoltek-green: #00D084`)
- Glassmorphism nos cards, sombras suaves, hover micro-animations
- Formato de moeda/percentual correto (`R$ 1.234,56` / `9,65%`)

#### 8. Riscos

Classificar cada risco encontrado:
- **Crítico** — indisponibilidade, perda de dados, falha grave de segurança, corrupção (corrigir antes do merge)
- **Alto Risco** — falha funcional relevante, regressão importante, correção recomendada antes do merge
- **Médio Risco** — impacto limitado, corrigir depois
- **Baixo Risco** — risco pequeno, cenário raro, aceitável

Apontar:
- Possíveis falhas em produção
- Casos extremos ainda não cobertos
- Pontos de atenção para homologação manual
- Riscos residuais (dependem de ambiente/config externa)

---

## Fase 3: Relatório

Produza o relatório usando **exatamente** esta estrutura. Inclua os resultados da execução dos testes (Fase 2.1).

### Resumo Executivo
- Requisitos atendidos: Sim / Parcial / Não
- Testes unitários: X/Y passando (Z% ) — comparar com run anterior
- Testes E2E: X/Y passando (Z%) — comparar com run anterior
- Recomendação: Sprint pronta para Release / Requer ajustes antes da Release
- Contagem por severidade: Crítico: X / Alto: X / Médio: X / Baixo: X

### Pontos Positivos
Aspectos corretamente implementados (boa cobertura, tratamento de exceções, cálculo preciso vs planilha, arquitetura consistente, identidade visual respeitada).

### Problemas Encontrados
Para cada problema, use este formato:

```
### [SEVERIDADE] Título curto

**Evidência:** Descrição objetiva com referência ao código/arquivo (ex: `src/engine/apportionment.ts:42`).
**Impacto:** Consequência esperada em produção.
**Sugestão:** Correção recomendada.
**Confiança:** Alta / Média / Baixa
```

- **Confiança Alta** — evidência direta no código
- **Confiança Média** — forte indício, depende de contexto não visível
- **Confiança Baixa** — hipótese plausível que requer validação

### Validações Executadas
Lista de cenários que foram validados ativamente durante a revisão e o resultado de cada um (✅ aprovado / ❌ falhou / ⚠️ ressalva). Inclua o que foi verificado: edge cases testados, cálculos conferidos, fluxos executados mentalmente.

### Recomendações
Sugestões objetivas de melhoria (comportamento e robustez, não estilo).

### Riscos Residuais
Riscos que não puderam ser completamente validados (dependem de ambiente, config externa, comportamento de terceiros).

### Conclusão
Responda explicitamente:

> Se esta Sprint fosse para produção hoje, o que ainda poderia dar errado?

Então informe exatamente uma:

- **Sprint pronta para Release** — sem problemas, ou apenas Baixos aceitáveis, e todos os requisitos atendidos
- **Requer ajustes antes da Release** — há Críticos/Altos não resolvidos, ou requisitos não atendidos

---

## Fase 4: Correções

### Atualização do AGENTS.md

Se durante a revisão você identificar lições aprendidas, regras de negócio não documentadas, ou padrões que deveriam ser seguidos em mudanças futuras, **promova a atualização do `AGENTS.md`** (e opcionalmente `docs/log-results.md`).

Inclua no plano de correções uma sugestão como: "Atualizar `AGENTS.md` para documentar [lição/regra encontrada] e evitar reincidência."

---

Após produzir o relatório, se houver problemas encontrados:

1. **Pare a execução automaticamente** assim que o relatório estiver pronto
2. **Monte um plano de correções** — para cada problema encontrado no relatório, defina:
   - O que precisa ser alterado (arquivos, linhas)
   - Como implementar a correção
   - Se a correção deve ser feita diretamente no código ou via OpenSpec change (change é preferível para alterações que envolvem múltiplos arquivos ou que devem ser rastreáveis)
3. **Apresente o plano ao usuário** com uma mensagem clara: "Encontrei X problemas. Aqui está o plano de correções que proponho. Posso implementar?"
4. **Aguarde a resposta do usuário** antes de executar qualquer correção
5. **Após aprovação, implemente**:
   - Para correções diretas: edite os arquivos, rode testes para verificar, atualize `docs/log-results.md`
   - Para OpenSpec changes: crie a change em `openspec/changes/<data>-<desc>/` com `proposal.md`, `design.md`, `tasks.md` e implemente as tasks

Se o usuário recusar o plano, Registre a decisão e os motivos no relatório final.

---

## Armadilhas a evitar

| Racionalização | Por que está errada |
|----------------|---------------------|
| "Mudança simples, sem riscos" | Mudanças simples frequentemente introduzem regressões por excesso de confiança |
| "Já tem teste, está coberto" | Testes não cobrem edge cases de integração nem falhas externas. Analise mesmo assim. |
| "Não encontrei nada relevante" | Revise novamente com foco em edge cases e regressões antes de concluir |
| "O diff é pequeno, revisão rápida" | Impacto não é proporcional ao tamanho do diff. Uma linha pode quebrar o cálculo. |
| "A UI está bonita, deve estar ok" | QA não é visual — use `ux-review` para isso. Aqui importa o comportamento. |
| "Listei cenários, já fiz minha parte" | Você precisa **validar** os cenários, não apenas listá-los. QA ativo > QA passivo. |

Se não encontrar problemas relevantes após análise deliberada e validação ativa, diga explicitamente que a implementação parece adequada — mas só após ter percorrido as 8 áreas e executado os testes com esforço real.
