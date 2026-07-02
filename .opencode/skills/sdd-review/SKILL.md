---
name: sdd-review
description: OpenSpec pre-Apply review for SDD changes. Use this skill whenever the user runs /sdd-review, asks to review an OpenSpec change before apply/implementation, or wants to check proposal.md, design.md, tasks.md, specs, docs, and AGENTS.md for consistency, scope, architecture, implementation readiness, database risks, and apply readiness.
---

# SDD Review

Use this skill to review an OpenSpec change before running Apply or starting implementation. The goal is to reduce rework by finding mismatches, missing decisions, hidden dependencies, and implementation risks while the change is still cheap to adjust.

## Inputs

Accept either:

- A change name, such as `sprint-8-pricing-validation`
- A path under `openspec/changes/`
- No argument, if the active change is obvious from the conversation

If the target change is not clear, ask one short clarification question before reviewing.

## Review Workflow

1. Locate the OpenSpec change folder.
2. Read the change artifacts when present: `proposal.md`, `design.md`, `tasks.md`, `specs/**`, and `.openspec.yaml`.
3. Read supporting project context when useful: root `AGENTS.md` if present, `docs/**` entries relevant to the change, and existing `openspec/specs/**` for affected capabilities.
4. Compare the artifacts against each other. Treat inconsistencies as more important than style issues because they create implementation loops.
5. Do not edit files during the review unless the user explicitly asks for fixes.

## What To Check

### Consistency

Check whether all artifacts describe the same solution.

Look for:

- Conflicting requirements
- Behavior described in only one artifact
- Tasks without a linked requirement or scenario
- Requirements or scenarios without corresponding tasks
- Spec deltas that do not match the proposal or design

### Scope

Check whether the change is appropriately sized.

Look for:

- Too much scope for one change
- Capabilities that should be split into separate changes
- Hidden dependencies between features
- Work that belongs in a later iteration

When suggesting a split, name the smaller capability boundaries rather than only saying "split this".

### Architecture

Check adherence to project guidance and existing architecture.

Look for:

- Violations of `AGENTS.md` or documented project conventions
- Folder structures that do not match nearby code
- Components, services, or modules that are likely to become too large
- Unnecessary coupling between UI, business rules, persistence, and integration code
- Maintenance risks introduced by the proposed structure

### Implementation Readiness

Check whether an implementation agent could execute the change without guessing.

Look for:

- Missing dependencies or packages
- Missing services, entities, hooks, components, migrations, seeds, or use cases
- Incomplete user flows
- Undefined error states, loading states, permissions, or edge cases
- Tasks that are too vague to verify as complete

### Database And Persistence

If the change touches persisted data, check database readiness.

Look for:

- Incomplete entities or columns
- Missing relationships, constraints, indexes, or seeds
- Data needed by the feature but not planned
- Migration, rollback, and compatibility risks
- Potential mismatch between OpenSpec requirements and existing schema docs

### Risk

Classify the change as `Baixo Risco`, `Medio Risco`, or `Alto Risco`.

Base risk on ambiguity, amount of cross-cutting work, database impact, architectural uncertainty, and likelihood that Apply will stall or loop.

## Output Format

Write the review in Portuguese unless the user asks otherwise.

Use this structure:

```markdown
# SDD Review: [change name]

## Veredito
[Pronto para Apply | Requer ajustes antes do Apply]

## Classificacao de Risco
[Baixo Risco | Medio Risco | Alto Risco]

## Pontos Positivos
- [aspectos bem definidos]

## Problemas Encontrados
- [Severidade: Alta|Media|Baixa] [arquivo/secao quando possivel] Problema, impacto e por que isso pode causar retrabalho.

## Recomendacoes
- [acao concreta antes do Apply]

## Checklist de Consistencia
- Proposal/design/tasks/specs alinhados: [Sim|Nao|Parcial]
- Requisitos com tarefas correspondentes: [Sim|Nao|Parcial]
- Tarefas com requisito associado: [Sim|Nao|Parcial]
- Escopo adequado para uma change: [Sim|Nao|Parcial]
- Arquitetura aderente ao projeto: [Sim|Nao|Parcial]
- Implementacao suficientemente especificada: [Sim|Nao|Parcial]
- Banco/persistencia suficientemente especificado: [Sim|Nao|Nao se aplica|Parcial]
```

Prioritize actionable findings over generic advice. If there are no issues in an area, say that briefly and move on. The final verdict should be strict: use `Pronto para Apply` only when an implementation agent can proceed without material ambiguity.
