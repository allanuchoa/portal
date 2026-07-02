---
description: Senior QA code review
agent: plan
---

Use the `qa-review` skill to perform a senior QA review of the code changes specified by the user.

Target: `$ARGUMENTS`

If `$ARGUMENTS` is empty, infer the target from the current conversation. Do not modify files. Produce the full QA review report with executive summary, findings by severity, confidence levels, and recommendation.
