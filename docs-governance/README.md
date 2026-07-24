# docs-governance

A project-agnostic skill for converging repository documentation into clear authority layers, explicit future routes, and an earned internal shape.

## Install

Install the `docs-governance/` directory as a skill. `SKILL.md` is the entry point; detailed doctrine is progressively disclosed through `references/`.

## Self-check

```bash
python3 scripts/self_check.py
```

## Repository audit

From the installed skill directory:

```bash
python3 scripts/run_docs_audit.py --repo /path/to/repository
```

The audit writes JSON to stdout and does not move files automatically.
