# SEO Crew Agent

A multi-agent pipeline for generating B2B foreign-trade SEO articles. Upload product images, provide a target keyword, and the system handles everything: image analysis → keyword research → content planning → article writing → quality review, with automatic revision loops until the article passes the quality gate.

Built with [CrewAI](https://github.com/joaomdmoura/crewAI) and DeepSeek. Outputs Markdown articles with JSON-LD structured data, image SEO metadata, and WordPress-ready HTML.

## How It Works

```
Product images → Vision model (image analysis, alt texts)
    ↓
[Researcher]  keyword matrix, product facts
    ↓
[Planner]     SEO content brief, H2 structure
    ↓
[Writer]      full Markdown article + JSON-LD + /llms.txt
    ↓
[Reviewer]    7-dimension scoring (max 70 pts)
    ↓
Pass? → save output
Fail? → revision loop (up to 5 rounds, with convergence detection)
```

**Quality gate:** total score ≥ 48, every dimension ≥ 6, EEAT trust ≥ 5.

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

| Variable | Required | Description |
|---|---|---|
| `DEEPSEEK_API_KEY` | Yes | DeepSeek text-generation API key |
| `VISION_MODEL_NAME` | Yes | Vision model (e.g. `gpt-4o-mini`) |
| `VISION_API_KEY` | Yes | Vision model API key |
| `API_TOKEN` | Recommended | Bearer token for write endpoints |
| `DEEPSEEK_BASE_URL` | No | Defaults to `https://api.deepseek.com/v1` |
| `VISION_BASE_URL` | No | Vision model API base URL |
| `WP_SITE_URL` | No | WordPress site URL (for publish feature) |
| `WP_USERNAME` | No | WordPress username |
| `WP_APP_PASSWORD` | No | WordPress application password |

Generate a secure API token:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Start the web UI

```bash
python server.py
# Open http://127.0.0.1:5000
```

### 4. Or run from CLI

```bash
python main.py \
  --keyword "custom marathon medals" \
  --customer-type "corporate" \
  --material "zinc alloy" \
  --images product1.jpg product2.jpg \
  --notes "Client emphasizes eco-friendly materials"
```

## API

All write endpoints require `Authorization: Bearer <API_TOKEN>` when `API_TOKEN` is set.

```bash
# Start a generation job
curl -X POST http://localhost:5000/api/generate \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"keyword": "custom medals", "customer_type": "corporate",
       "material": "zinc alloy", "images": ["<base64 data URL>"]}'

# Poll for result
curl http://localhost:5000/api/task/<task_id>

# Batch generation
curl -X POST http://localhost:5000/api/batch \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"keyword": "...", "customer_type": "...", "material": "...", "images": [...]}]}'
```

See [API endpoint table](#api-endpoints) below for the full list.

## Production Deployment

The built-in Flask server (`python server.py`) is for development only. Use [Gunicorn](https://gunicorn.org/) for production:

```bash
pip install gunicorn
gunicorn -w 1 -b 0.0.0.0:5000 --timeout 600 server:app
```

> **Why `-w 1` (single worker)?** The task store is in-process memory. Multiple workers would each have their own isolated `tasks` dict, so polling `GET /api/task/<id>` from a different worker than the one that started the job would return "not found". A single worker avoids this; article generation is I/O-bound (waiting on LLM APIs) so a single process handles concurrent requests fine.

For a robust setup behind nginx:

```nginx
location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_read_timeout 660;
    proxy_connect_timeout 10;
}
```

## Project Structure

```
main.py              CLI entry point
server.py            Flask API + single-page web UI
crew.py              CrewAI orchestration, revision loop, image analysis
agents.py            4 CrewAI agent definitions
tasks.py             Task factory (make_tasks) — fresh instances per request
config.py            Global config: models, thresholds, paths
knowledge/
  keywords.json      Keyword knowledge base (category/material/process data)
static/
  index.html         Single-page web UI (vanilla JS, no framework)
tests/
  test_utils.py      Unit tests for core utility functions
  test_server.py     Integration tests for Flask API
.github/workflows/
  ci.yml             GitHub Actions CI (Python 3.11 + 3.12)
output/              Generated articles and run logs (gitignored)
```

## Run Tests

```bash
python tests/test_utils.py
python tests/test_server.py
```

Tests run without real API keys (CrewAI and LLM dependencies are mocked).

## API Endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `POST /api/generate` | ✓ | Start async article generation, returns `task_id` |
| `GET /api/task/<id>` | — | Poll status; when done includes full article + scorecard |
| `GET /api/task/<id>/stream` | — | SSE progress stream |
| `POST /api/batch` | ✓ | Batch generate — `items[]` array |
| `GET /api/batch/<id>` | — | Batch status |
| `GET /api/stats` | — | Monthly aggregates from run logs |
| `GET /api/articles` | — | List generated articles |
| `POST /api/article/<id>/review` | ✓ | Approve / reject article |
| `POST /api/article/<id>/publish` | ✓ | Push to WordPress draft |
| `GET /api/article/<id>/download/md` | — | Download Markdown |
| `GET /api/article/<id>/download/json` | — | Download run log JSON |
| `GET /api/knowledge/categories` | — | List keyword categories |
| `PUT /api/knowledge/category/<name>` | ✓ | Update keyword data |

## Quality Dimensions

The Reviewer agent scores each article on 7 dimensions (1–10 each, max 70):

| Dimension | What it checks |
|---|---|
| `search_intent_match` | Does the article answer the core question? |
| `structure` | H2/H3 as planned, each H2 opens with core answer |
| `eeat_trust` | Evidence-backed claims, no fabricated data, author block |
| `so_what_test` | Every feature has a "which means…" benefit bridge |
| `specificity` | No vague superlatives without quantification |
| `ai_citability` | Structured data, cited statistics, /llms.txt block |
| `clarity_readability` | No Chinglish, active voice, one idea per sentence |

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT
