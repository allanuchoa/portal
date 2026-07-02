---
description: Review an OpenSpec change before Apply
agent: plan
---

Use the `sdd-review` skill to review the OpenSpec change specified by the user before running Apply.

Target change or path: `$ARGUMENTS`

If `$ARGUMENTS` is empty, infer the target change from the current conversation or ask one short clarification question. Do not modify files. Produce the full SDD Review report with verdict, risk classification, positives, problems, recommendations, and consistency checklist.
