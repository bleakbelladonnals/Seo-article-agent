"""
Flask API — SEO 文章生成 + 异步队列 + 审核 + WordPress 推送 + 知识库管理
启动: python server.py
访问: http://127.0.0.1:5000
"""
import json
import os
import re
import sys
import time
import uuid
import base64
import tempfile
import threading
import logging
import markdown
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, Response

sys.path.insert(0, os.path.dirname(__file__))
from crew import run_seo_pipeline
try:
    from crew import analyze_passage_citability
except ImportError:
    def analyze_passage_citability(article_text: str) -> dict:
        return {}

app = Flask(__name__, static_folder="static", static_url_path="")
logger = logging.getLogger("seo_crew_server")

_API_TOKEN = os.getenv("API_TOKEN", "")


def require_auth(f):
    """Require a Bearer token for write endpoints when API_TOKEN is configured."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not _API_TOKEN:
            return f(*args, **kwargs)
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer ") or auth[7:] != _API_TOKEN:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


BASE_DIR = os.path.dirname(__file__)
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
HISTORY_FILE = os.path.join(OUTPUT_DIR, "_history.json")
RUNS_DIR = os.path.join(OUTPUT_DIR, "runs")
ARTICLE_DB_FILE = os.path.join(OUTPUT_DIR, "_articles.json")
KNOWLEDGE_PATH = os.path.join(BASE_DIR, "knowledge", "keywords.json")

os.makedirs(RUNS_DIR, exist_ok=True)

# ── In-memory task store ─────────────────────
tasks: dict = {}  # task_id → {status, progress, result, error, created_at}
tasks_lock = threading.Lock()
_history_lock = threading.Lock()
_articles_lock = threading.Lock()
_knowledge_lock = threading.Lock()


def _load_history():
    if not os.path.exists(HISTORY_FILE):
        return []
    with open(HISTORY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_history(entry):
    with _history_lock:
        history = _load_history()
        history.insert(0, entry)
        history = history[:500]
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)


def _md_to_wordpress_html(md_text: str) -> str:
    html = markdown.markdown(md_text, extensions=["tables", "fenced_code", "codehilite"])
    return f"""<!-- wp:html -->
<div class="seo-article">
{html}
</div>
<!-- /wp:html -->"""


def _load_articles():
    if not os.path.exists(ARTICLE_DB_FILE):
        return {}
    with open(ARTICLE_DB_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_articles(db: dict):
    with _articles_lock:
        with open(ARTICLE_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, ensure_ascii=False, indent=2)


def _load_knowledge():
    if not os.path.exists(KNOWLEDGE_PATH):
        return {}
    with open(KNOWLEDGE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_knowledge(data: dict):
    with _knowledge_lock:
        os.makedirs(os.path.dirname(KNOWLEDGE_PATH), exist_ok=True)
        with open(KNOWLEDGE_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


# ══════════════════════════════════════════════════════════════
# 2.1 — 异步后台执行
# ══════════════════════════════════════════════════════════════

def _cleanup_old_tasks():
    """Clean up completed/failed tasks older than 24 hours to limit memory growth."""
    cutoff = time.time() - 86400
    to_delete = []
    with tasks_lock:
        for tid, t in tasks.items():
            if t.get("status") in ("done", "failed") and t.get("created_at", 0) < cutoff:
                to_delete.append(tid)
        for tid in to_delete:
            del tasks[tid]
    if to_delete:
        logger.info("Cleaned up %d expired tasks", len(to_delete))


def _run_in_background(task_id: str, kwargs: dict):
    """后台线程执行流水线，通过 on_progress 更新 tasks store 中的进度。"""
    try:
        with tasks_lock:
            tasks[task_id]["status"] = "running"
            tasks[task_id]["started_at"] = time.time()

        def on_progress(event: dict):
            with tasks_lock:
                tasks[task_id]["progress"] = event

        kwargs["on_progress"] = on_progress
        result = run_seo_pipeline(**kwargs)

        with tasks_lock:
            tasks[task_id]["status"] = "done"
            tasks[task_id]["result"] = result
            tasks[task_id]["duration_sec"] = round(
                time.time() - tasks[task_id]["started_at"], 1
            )

    except Exception as e:
        with tasks_lock:
            tasks[task_id]["status"] = "failed"
            tasks[task_id]["error"] = str(e)
            if "started_at" in tasks[task_id]:
                tasks[task_id]["duration_sec"] = round(
                    time.time() - tasks[task_id]["started_at"], 1
                )


def _sanitize_text(value: str, max_len: int, field_name: str) -> tuple[str, str | None]:
    """
    Clean and limit user-supplied prompt text.
    Returns (cleaned_value, error_message_or_None).
    """
    if len(value) > max_len:
        return "", f"{field_name} exceeds maximum length of {max_len} characters"
    cleaned = "".join(c for c in value if c >= " " or c in "\n\t\r")
    return cleaned, None


def _decode_images(image_data: list) -> tuple[list[str], list[str]]:
    """将 base64 data URL 列表解码为临时文件路径。返回 (paths, temp_file_paths)。"""
    valid_images = []
    temp_files = []
    for item in (image_data or []):
        if isinstance(item, str) and item.startswith("data:image/"):
            try:
                header, b64 = item.split(",", 1)
                if len(b64) > 14_000_000:
                    logger.warning("Image rejected: base64 length %d exceeds 14MB limit (~10MB raw)", len(b64))
                    print(f"  [WARN] Image skipped: too large ({len(b64) // 1_000_000}MB base64). Compress to under 10MB before uploading.")
                    continue
                ext_match = re.match(r"data:image/(\w+)", header)
                ext = ext_match.group(1) if ext_match else "png"
                if ext == "jpeg":
                    ext = "jpg"
                tmp = tempfile.NamedTemporaryFile(
                    delete=False, suffix=f".{ext}", dir=OUTPUT_DIR,
                )
                tmp.write(base64.b64decode(b64))
                tmp.close()
                valid_images.append(tmp.name)
                temp_files.append(tmp.name)
            except Exception:
                pass
        elif isinstance(item, str) and os.path.exists(item):
            valid_images.append(item)
    return valid_images, temp_files


def _build_response(result: dict, keyword: str, customer_type: str, material: str) -> dict:
    """从 pipeline 结果构造 API 响应。"""
    article_md = result.get("final_article", "")
    try:
        article_html = _md_to_wordpress_html(article_md)
    except Exception:
        article_html = f"<!-- wp:html --><pre>{article_md}</pre><!-- /wp:html -->"
    scorecard = result.get("scorecard")
    rounds = result.get("rounds", 1)
    history = result.get("history", [])
    image_seo = result.get("image_seo_data", [])

    return {
        "keyword": keyword,
        "customer_type": customer_type,
        "material": material,
        "article_md": article_md,
        "article_html": article_html,
        "scorecard": scorecard,
        "pass": scorecard.get("pass", False) if scorecard else None,
        "total_score": scorecard.get("total_score", 0) if scorecard else 0,
        "dimensions": scorecard.get("dimensions", []) if scorecard else [],
        "rounds": rounds,
        "history": [{"round": i + 1, "score": h.get("total_score", 0),
                     "passed": h.get("pass", False)} for i, h in enumerate(history)],
        "image_seo": result.get("vision_alt_texts", []) or image_seo,
        "vision_alt_texts": result.get("vision_alt_texts", []),
        "webp_paths": result.get("webp_paths", []),
        "output_path": result.get("output_path", ""),
        "generated_at": datetime.now().isoformat(),
        "geo_score": analyze_passage_citability(article_md),
    }


# ══════════════════════════════════════════════════════════════
# Routes — 基础
# ══════════════════════════════════════════════════════════════

@app.route("/")
def index():
    return send_from_directory("static", "index.html")


# ══════════════════════════════════════════════════════════════
# 2.1 — POST /api/generate（异步）
# ══════════════════════════════════════════════════════════════

@app.route("/api/generate", methods=["POST"])
@require_auth
def generate():
    try:
        data = request.get_json() or {}

        seo_keyword = data.get("keyword", "").strip()
        customer_type = data.get("customer_type", "").strip()
        material = data.get("material", "").strip()
        image_data = data.get("images", []) or []
        notes = data.get("notes", "").strip()

        if not seo_keyword:
            return jsonify({"error": "keyword is required"}), 400
        if not customer_type:
            return jsonify({"error": "customer_type is required"}), 400
        if not material:
            return jsonify({"error": "material is required"}), 400

        seo_keyword, err = _sanitize_text(seo_keyword, 200, "keyword")
        if err:
            return jsonify({"error": err}), 400
        customer_type, err = _sanitize_text(customer_type, 100, "customer_type")
        if err:
            return jsonify({"error": err}), 400
        material, err = _sanitize_text(material, 100, "material")
        if err:
            return jsonify({"error": err}), 400
        notes, err = _sanitize_text(notes, 1000, "notes")
        if err:
            return jsonify({"error": err}), 400

        valid_images, temp_files = _decode_images(image_data)
        if not valid_images:
            return jsonify({"error": "At least one product image is required"}), 400

        with tasks_lock:
            for existing_id, existing_task in tasks.items():
                if (
                    existing_task.get("status") in ("queued", "running")
                    and existing_task.get("keyword") == seo_keyword
                    and existing_task.get("customer_type") == customer_type
                    and existing_task.get("material") == material
                ):
                    logger.info("Duplicate submission detected, returning existing task_id: %s", existing_id)
                    for tf in temp_files:
                        try:
                            os.unlink(tf)
                        except OSError:
                            pass
                    return jsonify({
                        "task_id": existing_id,
                        "status": existing_task["status"],
                        "duplicate": True,
                    })

        _cleanup_old_tasks()
        task_id = uuid.uuid4().hex[:12]
        with tasks_lock:
            tasks[task_id] = {
                "status": "queued",
                "progress": {},
                "created_at": time.time(),
                "keyword": seo_keyword,
                "customer_type": customer_type,
                "material": material,
                "notes": notes,
                "image_count": len(valid_images),
                "temp_files": temp_files,
            }

        kwargs = {
            "product_image_paths": valid_images,
            "seo_keyword": seo_keyword,
            "customer_type": customer_type,
            "material": material,
            "notes": notes,
        }
        t = threading.Thread(target=_run_in_background, args=(task_id, kwargs), daemon=True)
        t.start()

        return jsonify({"task_id": task_id, "status": "queued"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# 2.2 — GET /api/task/<id> + SSE
# ══════════════════════════════════════════════════════════════

@app.route("/api/task/<task_id>")
def get_task(task_id):
    with tasks_lock:
        t = dict(tasks.get(task_id) or {})
    if not t:
        return jsonify({"error": "not found"}), 404
    elapsed_sec = None
    if t.get("started_at"):
        elapsed_sec = round(time.time() - t["started_at"], 1)
    resp = {
        "task_id": task_id,
        "status": t["status"],
        "progress": t.get("progress", {}),
        "elapsed_sec": elapsed_sec,
    }
    if t["status"] == "done":
        result = t["result"]
        resp["response"] = _build_response(
            result, t.get("keyword", ""), t.get("customer_type", ""), t.get("material", "")
        )
        resp["duration_sec"] = t.get("duration_sec", 0)
        # Save to history
        sc = result.get("scorecard") or {}
        _save_history({
            "task_id": task_id,
            "keyword": t.get("keyword", ""),
            "total_score": sc.get("total_score", 0),
            "pass": sc.get("pass", False),
            "rounds": result.get("rounds", 1),
            "output_path": result.get("output_path", ""),
            "generated_at": datetime.now().isoformat(),
        })
        # Register in article DB for review workflow
        db = _load_articles()
        db[task_id] = {
            "status": "draft",
            "keyword": t.get("keyword", ""),
            "customer_type": t.get("customer_type", ""),
            "material": t.get("material", ""),
            "total_score": sc.get("total_score", 0),
            "pass": sc.get("pass", False),
            "rounds": result.get("rounds", 1),
            "output_path": result.get("output_path", ""),
            "created_at": datetime.now().isoformat(),
        }
        _save_articles(db)
        # Clean up temp images
        for tf in t.get("temp_files", []):
            try:
                os.unlink(tf)
            except OSError:
                pass
    elif t["status"] == "failed":
        resp["error"] = t.get("error", "unknown error")
        for tf in t.get("temp_files", []):
            try:
                os.unlink(tf)
            except OSError:
                pass
    return jsonify(resp)


@app.route("/api/task/<task_id>/stream")
def stream_task(task_id):
    """SSE 进度推送."""
    def event_stream():
        last_progress = None
        while True:
            t = tasks.get(task_id)
            if not t:
                yield f"data: {json.dumps({'error': 'not found'})}\n\n"
                return
            current_progress = t.get("progress", {})
            if current_progress != last_progress:
                last_progress = dict(current_progress)
                yield f"data: {json.dumps({'status': t['status'], 'progress': current_progress})}\n\n"
            if t["status"] in ("done", "failed"):
                resp = {"status": t["status"]}
                if t["status"] == "done":
                    result = t["result"]
                    resp["response"] = _build_response(
                        result, t.get("keyword", ""), t.get("customer_type", ""), t.get("material", "")
                    )
                else:
                    resp["error"] = t.get("error", "unknown error")
                yield f"data: {json.dumps(resp)}\n\n"
                return
            time.sleep(2.0)
    return Response(event_stream(), mimetype="text/event-stream")


# ══════════════════════════════════════════════════════════════
# 2.4 — 统计 API
# ══════════════════════════════════════════════════════════════

@app.route("/api/stats")
def get_stats():
    """从 output/runs/*.json 聚合月度统计数据。"""
    monthly = {}
    if os.path.exists(RUNS_DIR):
        for fname in os.listdir(RUNS_DIR):
            if not fname.endswith(".json"):
                continue
            try:
                with open(os.path.join(RUNS_DIR, fname), "r", encoding="utf-8") as f:
                    run = json.load(f)
            except Exception:
                continue
            ym = run.get("created_at", "")[:7]
            if not ym:
                continue
            if ym not in monthly:
                monthly[ym] = {
                    "total_articles": 0,
                    "passed_articles": 0,
                    "total_tokens": 0,
                    "total_vision_tokens": 0,
                    "total_duration_sec": 0,
                    "avg_rounds": 0,
                    "articles": [],
                }
            m = monthly[ym]
            m["total_articles"] += 1
            final_score = run.get("final_score", 0)
            if final_score >= 48:
                m["passed_articles"] += 1
            m["total_tokens"] += run.get("total_tokens", 0)
            m["total_vision_tokens"] = m.get("total_vision_tokens", 0) + run.get("tokens_vision", 0)
            m["total_duration_sec"] += run.get("duration_sec", 0)
            m["avg_rounds"] += len(run.get("rounds", []))
            m["articles"].append({
                "keyword": run.get("keyword", ""),
                "score": final_score,
                "rounds": len(run.get("rounds", [])),
                "tokens": run.get("total_tokens", 0),
                "duration_sec": run.get("duration_sec", 0),
                "date": run.get("created_at", ""),
            })

    for ym, m in monthly.items():
        if m["total_articles"] > 0:
            m["pass_rate"] = round(m["passed_articles"] / m["total_articles"] * 100, 1)
            m["avg_rounds"] = round(m["avg_rounds"] / m["total_articles"], 1)
            m["avg_tokens"] = round(m["total_tokens"] / m["total_articles"])
            m["avg_duration_sec"] = round(m["total_duration_sec"] / m["total_articles"], 1)
            # 预估费用：DeepSeek ~$0.28/1M input, ~$1.10/1M output (rough average $0.50/1M)
            deepseek_cost = m["total_tokens"] / 1_000_000 * 0.42
            vision_cost = m.get("total_vision_tokens", 0) / 1_000_000 * 2.00
            m["estimated_cost_usd"] = round(deepseek_cost + vision_cost, 3)
            m["estimated_cost_deepseek_usd"] = round(deepseek_cost, 3)
            m["estimated_cost_vision_usd"] = round(vision_cost, 3)
        else:
            m["pass_rate"] = 0
            m["avg_rounds"] = 0
            m["avg_tokens"] = 0
            m["avg_duration_sec"] = 0
            m["estimated_cost_usd"] = 0
            m["estimated_cost_deepseek_usd"] = 0
            m["estimated_cost_vision_usd"] = 0

    return jsonify({
        "monthly": monthly,
        "total_runs": len(tasks),
    })


# ══════════════════════════════════════════════════════════════
# 3.1 — 批量生成
# ══════════════════════════════════════════════════════════════

batch_store: dict = {}  # batch_id → {status, tasks[], created_at}
batch_store_lock = threading.Lock()


@app.route("/api/batch", methods=["POST"])
@require_auth
def create_batch():
    """接收 [{keyword, customer_type, material, images, notes}, ...]，创建批次。"""
    try:
        data = request.get_json() or {}
        items = data.get("items", [])
        if not items:
            return jsonify({"error": "items list is required"}), 400

        batch_id = uuid.uuid4().hex[:8]
        batch_tasks = []
        for item in items:
            task_id = uuid.uuid4().hex[:12]
            valid_images, temp_files = _decode_images(item.get("images", []) or [])
            if not valid_images:
                continue
            keyword, _ = _sanitize_text(str(item.get("keyword", "")).strip(), 200, "keyword")
            customer_type, _ = _sanitize_text(str(item.get("customer_type", "")).strip(), 100, "customer_type")
            material, _ = _sanitize_text(str(item.get("material", "")).strip(), 100, "material")
            notes, _ = _sanitize_text(str(item.get("notes", "")).strip(), 1000, "notes")
            with tasks_lock:
                tasks[task_id] = {
                    "status": "queued",
                    "progress": {},
                    "created_at": time.time(),
                    "keyword": keyword,
                    "customer_type": customer_type,
                    "material": material,
                    "notes": notes,
                    "image_count": len(valid_images),
                    "temp_files": temp_files,
                    "batch_id": batch_id,
                }
            batch_tasks.append(task_id)

        with batch_store_lock:
            batch_store[batch_id] = {
                "status": "queued",
                "task_ids": batch_tasks,
                "current_index": 0,
                "created_at": time.time(),
            }

        # 后台串行执行
        def _run_batch():
            for task_id in batch_tasks:
                with tasks_lock:
                    t = tasks.get(task_id)
                if not t:
                    continue
                kwargs = {
                    "product_image_paths": [],
                    "seo_keyword": t.get("keyword", ""),
                    "customer_type": t.get("customer_type", ""),
                    "material": t.get("material", ""),
                    "notes": t.get("notes", ""),
                }
                # Re-decode images from store
                kwargs["product_image_paths"] = [
                    tf for tf in t.get("temp_files", []) if os.path.exists(tf)
                ]
                if not kwargs["product_image_paths"]:
                    with tasks_lock:
                        tasks[task_id]["status"] = "failed"
                        tasks[task_id]["error"] = "No valid images"
                    continue
                _run_in_background(task_id, kwargs)
                # 批量模式：子任务完成后立即清理临时文件（不依赖客户端轮询）
                with tasks_lock:
                    finished_task = tasks.get(task_id, {})
                    if finished_task.get("status") in ("done", "failed"):
                        for tf in finished_task.get("temp_files", []):
                            try:
                                os.unlink(tf)
                            except OSError:
                                pass
                        finished_task["temp_files"] = []

        t = threading.Thread(target=_run_batch, daemon=True)
        t.start()

        return jsonify({"batch_id": batch_id, "task_count": len(batch_tasks)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/batch/<batch_id>")
def get_batch(batch_id):
    with batch_store_lock:
        b = batch_store.get(batch_id)
        if b:
            b = dict(b)
    if not b:
        return jsonify({"error": "not found"}), 404
    task_statuses = []
    for tid in b["task_ids"]:
        t = tasks.get(tid, {})
        task_statuses.append({
            "task_id": tid,
            "status": t.get("status", "unknown"),
            "keyword": t.get("keyword", ""),
            "progress": t.get("progress", {}),
        })
    done_count = sum(1 for ts in task_statuses if ts["status"] in ("done", "failed"))
    return jsonify({
        "batch_id": batch_id,
        "status": "done" if done_count == len(task_statuses) else "running",
        "progress": f"{done_count}/{len(task_statuses)}",
        "tasks": task_statuses,
    })


# ══════════════════════════════════════════════════════════════
# 3.2 — 审核流程 + WordPress
# ══════════════════════════════════════════════════════════════

@app.route("/api/articles", methods=["GET"])
def list_articles():
    """文章列表，按状态筛选。"""
    db = _load_articles()
    status_filter = request.args.get("status", "")
    keyword_filter = request.args.get("keyword", "").strip().lower()
    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = min(200, max(1, int(request.args.get("limit", 50))))
    except (ValueError, TypeError):
        page, limit = 1, 50

    articles = []
    for run_id, art in db.items():
        if status_filter and art.get("status", "draft") != status_filter:
            continue
        if keyword_filter and keyword_filter not in art.get("keyword", "").lower():
            continue
        articles.append({"run_id": run_id, **art})
    articles.sort(key=lambda a: a.get("created_at", ""), reverse=True)

    total = len(articles)
    start = (page - 1) * limit
    return jsonify({
        "articles": articles[start: start + limit],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit),
    })


@app.route("/api/article/<run_id>/review", methods=["POST"])
@require_auth
def review_article(run_id):
    """审核通过/驳回。body: {action: "approve"|"reject", reason: "..."} """
    db = _load_articles()
    if run_id not in db:
        return jsonify({"error": "not found"}), 404

    data = request.get_json() or {}
    action = data.get("action", "")
    reason = data.get("reason", "")

    if action == "approve":
        db[run_id]["status"] = "approved"
        db[run_id]["reviewed_at"] = datetime.now().isoformat()
        if "gsc_position" in data:
            db[run_id]["gsc_position"] = data.get("gsc_position")
        if "gsc_clicks" in data:
            db[run_id]["gsc_clicks"] = data.get("gsc_clicks")
        if "published_url" in data:
            db[run_id]["published_url"] = data.get("published_url")
    elif action == "reject":
        db[run_id]["status"] = "rejected"
        db[run_id]["reject_reason"] = reason
        db[run_id]["reviewed_at"] = datetime.now().isoformat()
    else:
        return jsonify({"error": "action must be 'approve' or 'reject'"}), 400

    _save_articles(db)
    return jsonify({"run_id": run_id, "status": db[run_id]["status"]})


@app.route("/api/article/<run_id>/seo", methods=["PATCH"], endpoint="update_article_seo")
@require_auth
def update_article_seo(run_id):
    """Update manually collected SEO performance fields for an article."""
    db = _load_articles()
    if run_id not in db:
        return jsonify({"error": "not found"}), 404
    data = request.get_json() or {}
    allowed = ("gsc_position", "gsc_clicks", "published_url")
    for field in allowed:
        if field in data:
            db[run_id][field] = data[field]
    db[run_id]["seo_updated_at"] = datetime.now().isoformat()
    _save_articles(db)
    return jsonify({"run_id": run_id, "updated": {k: data[k] for k in allowed if k in data}})


@app.route("/api/article/<run_id>/publish", methods=["POST"])
@require_auth
def publish_article(run_id):
    """推送到 WordPress 草稿。"""
    db = _load_articles()
    art = db.get(run_id)
    if not art:
        return jsonify({"error": "not found"}), 404
    if art.get("status") != "approved":
        return jsonify({"error": "article must be approved before publishing"}), 400

    wp_url = os.getenv("WP_SITE_URL", "")
    wp_user = os.getenv("WP_USERNAME", "")
    wp_pass = os.getenv("WP_APP_PASSWORD", "")

    if not wp_url or not wp_user or not wp_pass:
        return jsonify({"error": "WordPress not configured. Set WP_SITE_URL, WP_USERNAME, WP_APP_PASSWORD in .env"}), 500

    # Read the article markdown from output
    output_path = art.get("output_path", "")
    article_text = ""
    if output_path and os.path.exists(output_path):
        with open(output_path, "r", encoding="utf-8") as f:
            article_text = f.read()

    title = art.get("keyword", "SEO Article")
    html_body = _md_to_wordpress_html(article_text)

    try:
        import requests as req
        api_url = wp_url.rstrip("/") + "/wp-json/wp/v2/posts"
        resp = req.post(
            api_url,
            auth=(wp_user, wp_pass),
            json={
                "title": title,
                "content": html_body,
                "status": "draft",
            },
            timeout=30,
        )
        if resp.status_code in (200, 201):
            wp_data = resp.json()
            art["wp_post_id"] = wp_data.get("id")
            art["wp_post_url"] = wp_data.get("link", "")
            art["wp_status"] = "draft"
            art["pushed_at"] = datetime.now().isoformat()
            _save_articles(db)
            return jsonify({"status": "ok", "wp_post_id": art["wp_post_id"], "wp_post_url": art["wp_post_url"]})
        else:
            return jsonify({"error": f"WordPress API returned {resp.status_code}: {resp.text[:300]}"}), 502
    except ImportError:
        return jsonify({"error": "requests library not installed. Run: pip install requests"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════
# 3.3 — 知识库管理
# ══════════════════════════════════════════════════════════════

@app.route("/api/knowledge/categories", methods=["GET"])
def list_categories():
    kb = _load_knowledge()
    cats = {}
    for name, data in kb.get("categories", {}).items():
        cats[name] = {
            "seed_keyword": data.get("seed_keyword", ""),
            "keyword_count": len(data.get("main_keywords", [])),
        }
    last_updated = kb.get("last_updated")
    stale_warning = True
    if last_updated:
        try:
            stale_warning = (datetime.now() - datetime.fromisoformat(last_updated[:10])).days > 90
        except ValueError:
            stale_warning = True
    return jsonify({
        "categories": cats,
        "materials": kb.get("materials", {}),
        "processes": kb.get("processes", {}),
        "last_updated": last_updated,
        "stale_warning": stale_warning,
    })


@app.route("/api/knowledge/category/<name>", methods=["GET"])
def get_category(name):
    kb = _load_knowledge()
    cat = kb.get("categories", {}).get(name)
    if not cat:
        return jsonify({"error": "not found"}), 404
    return jsonify(cat)


@app.route("/api/knowledge/category/<name>", methods=["PUT"])
@require_auth
def update_category(name):
    kb = _load_knowledge()
    if "categories" not in kb:
        kb["categories"] = {}
    data = request.get_json() or {}
    kb["categories"][name] = data
    kb["last_updated"] = datetime.now().isoformat()[:10]
    _save_knowledge(kb)
    return jsonify({"status": "ok"})


@app.route("/api/knowledge/category/<name>", methods=["DELETE"])
@require_auth
def delete_category(name):
    kb = _load_knowledge()
    if name in kb.get("categories", {}):
        del kb["categories"][name]
        _save_knowledge(kb)
    return jsonify({"status": "ok"})


# ══════════════════════════════════════════════════════════════
# 输出文件访问
# ══════════════════════════════════════════════════════════════

@app.route("/api/article/<run_id>/download/md")
def download_article_md(run_id):
    """Download the generated article Markdown file."""
    db = _load_articles()
    art = db.get(run_id)
    if not art:
        return jsonify({"error": "not found"}), 404
    output_path = art.get("output_path", "")
    if not output_path or not os.path.isfile(output_path):
        return jsonify({"error": "file not found"}), 404
    return send_from_directory(
        os.path.dirname(os.path.abspath(output_path)),
        os.path.basename(output_path),
        as_attachment=True,
        download_name=f"seo-article-{run_id[:8]}.md",
    )


@app.route("/api/article/<run_id>/download/json")
def download_article_json(run_id):
    """Download the run log JSON inferred from article_X.md -> run_X.json."""
    db = _load_articles()
    art = db.get(run_id)
    if not art:
        return jsonify({"error": "not found"}), 404
    output_path = art.get("output_path", "")
    if not output_path:
        return jsonify({"error": "output path not recorded"}), 404
    uid_part = os.path.basename(output_path).replace("article_", "").replace(".md", "")
    log_name = f"run_{uid_part}.json"
    log_path = os.path.join(RUNS_DIR, log_name)
    if not os.path.isfile(log_path):
        return jsonify({"error": "run log not found"}), 404
    return send_from_directory(
        RUNS_DIR,
        log_name,
        as_attachment=True,
        download_name=f"seo-runlog-{run_id[:8]}.json",
    )


@app.route("/api/article/<run_id>/download/pdf")
def download_article_pdf(run_id):
    """Generate and download a PDF report when WeasyPrint is available."""
    try:
        import weasyprint
    except ImportError:
        return jsonify({"error": "weasyprint not installed. Run: pip install weasyprint"}), 500

    db = _load_articles()
    art = db.get(run_id)
    if not art:
        return jsonify({"error": "not found"}), 404

    output_path = art.get("output_path", "")
    article_md = ""
    if output_path and os.path.isfile(output_path):
        with open(output_path, "r", encoding="utf-8") as f:
            article_md = f.read()

    keyword = art.get("keyword", "SEO Article")
    score = art.get("total_score", 0)
    passed = art.get("pass", False)
    rounds = art.get("rounds", 1)
    created_at = art.get("created_at", "")[:10]
    escape_html = lambda v: str(v).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    keyword_html = escape_html(keyword)
    article_preview = escape_html(article_md[:1200])

    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#1a1a2e;font-size:14px}}
h1{{color:#00c897;border-bottom:2px solid #00c897;padding-bottom:8px}}
.kpi{{display:inline-block;background:#f0faf8;border:1px solid #00c897;border-radius:8px;padding:12px 20px;margin:8px;text-align:center}}
.kpi-val{{font-size:28px;font-weight:700;color:#00c897}}
.kpi-lbl{{font-size:12px;color:#666}}
.badge{{display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600}}
.pass{{background:#d1fae5;color:#065f46}}.fail{{background:#fee2e2;color:#991b1b}}
pre{{background:#f5f5f5;padding:12px;border-radius:6px;font-size:11px;white-space:pre-wrap;max-height:300px;overflow:hidden}}
</style></head><body>
<h1>SEO Content Report</h1>
<p><strong>Keyword:</strong> {keyword_html} &nbsp;|&nbsp; <strong>Date:</strong> {created_at} &nbsp;|&nbsp;
<span class="badge {'pass' if passed else 'fail'}">{'PASS' if passed else 'FAIL'}</span></p>
<div>
  <div class="kpi"><div class="kpi-val">{score}/70</div><div class="kpi-lbl">Quality Score</div></div>
  <div class="kpi"><div class="kpi-val">{rounds}</div><div class="kpi-lbl">Revision Rounds</div></div>
  <div class="kpi"><div class="kpi-val">{'YES' if passed else 'NO'}</div><div class="kpi-lbl">Quality Gate</div></div>
</div>
<h2>Article Preview</h2>
<pre>{article_preview}</pre>
<p style="font-size:11px;color:#999;margin-top:40px">Generated by SEO Crew Agent &mdash; {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
</body></html>"""

    try:
        from io import BytesIO
        from flask import send_file

        pdf_bytes = weasyprint.HTML(string=html).write_pdf()
        return send_file(
            BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"seo-report-{run_id[:8]}.pdf",
        )
    except Exception as e:
        return jsonify({"error": f"PDF generation failed: {e}"}), 500


@app.route("/api/outputs", methods=["GET"])
def list_outputs():
    history = _load_history()
    return jsonify(history)


@app.route("/api/outputs/<path:filename>")
def get_output(filename):
    return send_from_directory(OUTPUT_DIR, filename)


if __name__ == "__main__":
    print("\n  SEO Crew Agent API Server")
    print("  http://127.0.0.1:5000\n")
    app.run(debug=False, host="127.0.0.1", port=5000)
