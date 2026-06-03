# CLAUDE.md

This file provides guidance to Claude Code when working in this repository. Read it before making any changes.

## Commands

```bash
pip install -r requirements.txt          # install deps
python server.py                         # web UI at http://127.0.0.1:5000
python main.py --keyword "custom marathon medals" --customer-type "corporate" \
  --material "zinc alloy" --images product.jpg   # CLI
python tests/test_utils.py && python tests/test_server.py   # tests
python -c "import secrets; print(secrets.token_hex(32))"    # generate API_TOKEN
```

Environment: copy `.env.example` to `.env`. `DEEPSEEK_API_KEY`, `VISION_API_KEY`, and `VISION_MODEL_NAME` are required — `config.py` raises `RuntimeError` immediately if any are missing.

## Architecture

**Phase 1 — Initial pipeline (sequential CrewAI tasks):**
```
_analyze_images()     # Vision model via openai SDK (not CrewAI), extracts product JSON + alt texts
  → research_task     # Researcher: keyword matrix from image JSON + knowledge/keywords.json
  → planning_task     # Planner: SEO content brief, H2 structure, FAQ
  → writing_task      # Writer: full Markdown article + Image SEO Data + JSON-LD Schema + /llms.txt
  → review_task       # Reviewer: 7-dimension scorecard JSON
```

**Phase 2 — Revision loop (up to `MAX_REVISION_ROUNDS = 5`):**
```
_check_pass(scorecard)        # Python-side gate — not LLM boolean
  → revision_writing_task     # Injected via {current_article} — no context[] to avoid stale chain
  → revision_review_task
```

Loop stops on convergence (last 2 score deltas < 3 pts) or regression (delta > −15 pts reverts to best version).

**Non-obvious constraints:**
- `revision_writing_task` has no `context=[]` intentionally — article + fix suggestions are injected as template variables.
- Task descriptions use `{variable}` for CrewAI injection and `{{ }}` for literal braces in JSON examples. Never mix these in a `.format()` call without escaping.
- `_extract_scorecard()` uses a bracket-depth counter + JSON auto-repair — the Reviewer sometimes wraps output in markdown fences.
- `make_tasks()` creates fresh Task instances per call — module-level Task objects would cause concurrent request contamination in Flask's threaded mode.
- Token budget guards: 500K total tokens, 120K per-round completion ceiling, 25K char article truncation.

## Key Files

| File | Role |
|------|------|
| `crew.py` | Orchestration, image analysis, WebP conversion, GEO scoring, schema build, run logs |
| `agents.py` | 4 CrewAI agent definitions; LLM config injected from `config.py` |
| `tasks.py` | `make_tasks()` — returns fresh Task instances each pipeline run |
| `config.py` | `QUALITY_THRESHOLD=48`, `EEAT_MIN_SCORE=5`, model config |
| `server.py` | Flask API — all write endpoints require `Authorization: Bearer <API_TOKEN>` |
| `knowledge/keywords.json` | Keyword DB (category/material/process); loaded by `_retrieve_keywords()` |
| `static/index.html` | Single-file SPA — vanilla JS, dark theme, no framework |
| `CODEX_TASKS_P4.md` | Pending feature tasks (TASK-19 to TASK-22) — read before adding new UI/API features |

## Key Functions in crew.py

| Function | What it does |
|----------|-------------|
| `run_seo_pipeline()` | Main entry point — image paths → final article dict |
| `_analyze_images()` | Vision model call → product JSON + alt text list |
| `_retrieve_keywords()` | knowledge/keywords.json lookup by category |
| `analyze_passage_citability()` | GEO metric — scores paragraphs against 134-167 word optimal window |
| `build_article_schema()` | Python-constructed Article JSON-LD (not LLM output) |
| `build_faq_schema()` | Parses FAQ section → FAQPage JSON-LD |
| `_extract_scorecard()` | Bracket-depth JSON extractor + auto-repair |
| `_check_pass()` | Python gate: total ≥ 48, all dims ≥ 6, EEAT ≥ 5 |

## Key API Endpoints (server.py)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/generate` | ✓ | Start async article generation, returns `task_id` |
| `GET /api/task/<id>` | — | Poll status; when done includes `response.geo_score` |
| `GET /api/task/<id>/stream` | — | SSE progress stream |
| `POST /api/batch` | ✓ | Batch generate — `items[]` each with own keyword/customer_type/material |
| `GET /api/stats` | — | Monthly aggregates from `output/runs/*.json` |
| `GET /api/article/<id>/download/md` | — | Download article Markdown |
| `GET /api/article/<id>/download/json` | — | Download run log JSON |
| `POST /api/article/<id>/review` | ✓ | Approve/reject article |
| `POST /api/article/<id>/publish` | ✓ | Push to WordPress (requires WP env vars) |

`_build_response()` at `server.py:182` shapes the task result into the API response — it includes `geo_score` (from `analyze_passage_citability()`). Modify this function when adding new fields to the generation result.

## Output File Naming

```
output/article_YYYYMMDD_HHMMSS_uid.md    ← article Markdown
output/runs/run_YYYYMMDD_HHMMSS_uid.json ← structured run log
output/_debug_*.txt                       ← scorecard extraction failures
```

The `uid` part is shared between article and run log — strip `article_` prefix and `.md` to get the log filename.

## Quality Thresholds

Pass gate (enforced in `_check_pass()`, not by the LLM):
- Every dimension ≥ 6 / 10
- Total ≥ 48 / 70
- EEAT dimension ≥ 5 / 10

## Content Boundaries

Hard ban in H2/H3/FAQ headings: MOQ, Lead Time, Delivery Time, Customization Process, Payment Terms, Certifications (ISO/SGS), Pricing, Shipping. Intentional product positioning — do not remove.

## Pending Work

See `CODEX_TASKS_P4.md` for outstanding tasks (TASK-19 to TASK-22):
- **TASK-19** — Stats tab: Chart.js score trend chart
- **TASK-20** — Batch UI: CSV import (per-row customer_type/material)
- **TASK-21** — Report tab: GEO Score panel (uses `resp.geo_score` from API)
- **TASK-22** — PDF download endpoint (weasyprint, Windows needs GTK3)
