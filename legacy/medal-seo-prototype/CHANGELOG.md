# Changelog

All notable changes to this project are documented here.

## [1.1.0] - 2026-06-03

### Added
- GEO scoring: `analyze_passage_citability()` scores each paragraph against the 134–167 word AI-citation window, surfacing articles likely to be cited by AI search engines (Perplexity, ChatGPT, AI Overviews)
- Structured run logs saved to `output/runs/run_<id>.json` with token counts, duration, cost estimates
- Stats API (`GET /api/stats`) aggregates monthly pass rate, token usage, and estimated cost across all runs
- Article review workflow: approve / reject via `POST /api/article/<id>/review`
- WordPress push: `POST /api/article/<id>/publish` sends approved articles as drafts
- Knowledge base management API (`GET/PUT/DELETE /api/knowledge/category/<name>`)
- PDF download endpoint (optional; requires WeasyPrint — see requirements.txt)
- SSE real-time progress stream (`GET /api/task/<id>/stream`)
- Duplicate submission detection in `/api/generate`

### Fixed
- Thread safety: added per-resource locks (`_history_lock`, `_articles_lock`, `_knowledge_lock`, `batch_store_lock`) for all file I/O read-modify-write operations
- `get_task()` now snapshots the task dict under `tasks_lock` before reading, eliminating a read-side race condition
- Batch API now applies the same input sanitisation (`_sanitize_text`) as the single-generate endpoint

### Changed
- `tasks.py` refactored into a factory function (`make_tasks()`) — Task instances are created fresh per pipeline run, preventing concurrent request context contamination in Flask's threaded mode
- Article meta description for JSON-LD now extracted from the first body paragraph instead of the outline header
- Revision rounds now inject a compressed research/planning summary (~2K tokens) instead of full raw output (~260K tokens), reducing per-round cost by ~80%

---

## [1.0.0] - 2026-05-27

### Added
- Initial release: 4-agent CrewAI pipeline (Researcher → Planner → Writer → Reviewer)
- Vision model integration for product image analysis and SEO alt text generation
- Automatic WebP conversion for uploaded images
- 7-dimension quality scoring with revision loop (up to 5 rounds)
- Convergence detection: exits early when score delta < 3 pts for two consecutive rounds
- Regression protection: reverts to previous version on score drops > 15 pts
- Token budget guardrails: per-round completion ceiling (120K) and total budget (500K)
- JSON-LD Article and FAQPage schema constructed in Python (not LLM-generated)
- Bearer token authentication for write endpoints
- Input sanitisation against prompt injection
- Flask web UI (`static/index.html`) — single-page, no framework
- CLI entry point (`main.py`)
- GitHub Actions CI (Python 3.11 + 3.12)
- Unit tests for core utilities; integration tests for Flask API endpoints
