---
description: Revisão de código pós-Apply — arquitetura, qualidade, robustez, performance, segurança, consistência, riscos
agent: plan
---

Use the `code-review` skill to review code that was just implemented (after an OpenSpec Apply).

Target change or path: `$ARGUMENTS`

If `$ARGUMENTS` is empty, infer the target from the current conversation — the most recently applied change, the files in the current git diff, or the change being discussed. Do not modify files. Produce the full Code Review report with positive points, problems found, risk classification, recommendations, and conclusion.
