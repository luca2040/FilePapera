import os
import json
import hashlib
import uuid
import time
import shutil
from pathlib import Path
from typing import Optional
from flask import current_app

from .api_utils import check_valid_path


PARTIAL_DIR_NAME = ".partial"
CHUNK_SIZE_DEFAULT = 5 * 1024 * 1024
PARTIAL_TTL_SECONDS = 24 * 60 * 60


def _partial_root() -> Path:
    return Path(current_app.config["UPLOAD_FOLDER"]) / PARTIAL_DIR_NAME


def _upload_dir(upload_id: str) -> Path:
    return _partial_root() / upload_id


def _metadata_path(upload_id: str) -> Path:
    return _upload_dir(upload_id) / "metadata.json"


def _chunk_path(upload_id: str, chunk_index: int) -> Path:
    return _upload_dir(upload_id) / f"chunk_{chunk_index:06d}"


def _load_metadata(upload_id: str) -> Optional[dict]:
    path = _metadata_path(upload_id)
    if not path.exists():
        return None
    with open(path, "r") as f:
        return json.load(f)


def _save_metadata(upload_id: str, meta: dict) -> None:
    path = _metadata_path(upload_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(meta, f)


def initiate_upload(
    filename: str,
    total_size: int,
    target_path: str,
    expected_hash: Optional[str] = None,
    chunk_size: int = CHUNK_SIZE_DEFAULT,
) -> dict:
    upload_id = uuid.uuid4().hex[:16]
    total_chunks = (total_size + chunk_size - 1) // chunk_size

    meta = {
        "upload_id": upload_id,
        "filename": filename,
        "total_size": total_size,
        "target_path": target_path,
        "expected_hash": expected_hash,
        "chunk_size": chunk_size,
        "total_chunks": total_chunks,
        "uploaded_chunks": [],
        "status": "in_progress",
        "created_at": time.time(),
        "updated_at": time.time(),
    }
    _save_metadata(upload_id, meta)
    return {"upload_id": upload_id, "chunk_size": chunk_size, "total_chunks": total_chunks}


def upload_chunk(upload_id: str, chunk_index: int, data: bytes) -> dict:
    meta = _load_metadata(upload_id)
    if not meta:
        return {"error": "Upload not found"}, 404
    if meta["status"] != "in_progress":
        return {"error": f"Upload status is {meta['status']}"}, 400
    if chunk_index < 0 or chunk_index >= meta["total_chunks"]:
        return {"error": "Invalid chunk index"}, 400
    if chunk_index in meta["uploaded_chunks"]:
        return {"chunk_index": chunk_index, "status": "already_uploaded"}, 200

    expected_len = meta["chunk_size"]
    if chunk_index == meta["total_chunks"] - 1:
        expected_len = meta["total_size"] - chunk_index * meta["chunk_size"]
    if len(data) != expected_len:
        return {"error": f"Chunk size mismatch: expected {expected_len}, got {len(data)}"}, 400

    _upload_dir(upload_id).mkdir(parents=True, exist_ok=True)
    with open(_chunk_path(upload_id, chunk_index), "wb") as f:
        f.write(data)

    meta["uploaded_chunks"].append(chunk_index)
    meta["uploaded_chunks"].sort()
    meta["updated_at"] = time.time()
    _save_metadata(upload_id, meta)

    return {"chunk_index": chunk_index, "status": "uploaded"}, 200


def get_upload_status(upload_id: str) -> dict:
    meta = _load_metadata(upload_id)
    if not meta:
        return {"error": "Upload not found"}, 404
    return {
        "upload_id": upload_id,
        "filename": meta["filename"],
        "total_size": meta["total_size"],
        "total_chunks": meta["total_chunks"],
        "uploaded_chunks": meta["uploaded_chunks"],
        "missing_chunks": [i for i in range(meta["total_chunks"]) if i not in meta["uploaded_chunks"]],
        "status": meta["status"],
        "progress": len(meta["uploaded_chunks"]) / meta["total_chunks"] * 100,
    }, 200


def complete_upload(upload_id: str) -> dict:
    meta = _load_metadata(upload_id)
    if not meta:
        return {"error": "Upload not found"}, 404
    if meta["status"] != "in_progress":
        return {"error": f"Upload status is {meta['status']}"}, 400
    if len(meta["uploaded_chunks"]) != meta["total_chunks"]:
        missing = [i for i in range(meta["total_chunks"]) if i not in meta["uploaded_chunks"]]
        return {"error": "Missing chunks", "missing_chunks": missing}, 400

    enc = current_app.config["FILENAME_ENCODER"]
    target_path = meta["target_path"]
    full_target = os.path.join(current_app.config["UPLOAD_FOLDER"], target_path, meta["filename"])
    full_target = enc.encode(full_target)

    if check_valid_path(full_target):
        _cleanup_upload(upload_id)
        return {"error": "Invalid path"}, 403

    os.makedirs(os.path.dirname(full_target), exist_ok=True)

    sha256_hash = hashlib.sha256()
    with open(full_target, "wb") as out:
        for i in range(meta["total_chunks"]):
            chunk_file = _chunk_path(upload_id, i)
            with open(chunk_file, "rb") as f:
                while chunk := f.read(262144):
                    out.write(chunk)
                    sha256_hash.update(chunk)

    received_hash = sha256_hash.hexdigest()
    if meta["expected_hash"] and meta["expected_hash"] != received_hash:
        os.remove(full_target)
        _cleanup_upload(upload_id)
        return {"error": "Hash mismatch", "expected": meta["expected_hash"], "got": received_hash}, 400

    meta["status"] = "completed"
    meta["final_hash"] = received_hash
    meta["updated_at"] = time.time()
    _save_metadata(upload_id, meta)

    _cleanup_upload(upload_id)

    return {"message": "Upload completed", "sha256": received_hash}, 200


def cancel_upload(upload_id: str) -> dict:
    meta = _load_metadata(upload_id)
    if not meta:
        return {"error": "Upload not found"}, 404
    _cleanup_upload(upload_id)
    return {"message": "Upload cancelled"}, 200


def _cleanup_upload(upload_id: str) -> None:
    upload_dir = _upload_dir(upload_id)
    if upload_dir.exists():
        shutil.rmtree(upload_dir, ignore_errors=True)


def cleanup_expired_uploads() -> int:
    root = _partial_root()
    if not root.exists():
        return 0
    now = time.time()
    cleaned = 0
    for entry in root.iterdir():
        if not entry.is_dir():
            continue
        meta_path = entry / "metadata.json"
        if not meta_path.exists():
            shutil.rmtree(entry, ignore_errors=True)
            cleaned += 1
            continue
        try:
            with open(meta_path, "r") as f:
                meta = json.load(f)
            if now - meta.get("updated_at", 0) > PARTIAL_TTL_SECONDS:
                shutil.rmtree(entry, ignore_errors=True)
                cleaned += 1
        except (json.JSONDecodeError, OSError):
            shutil.rmtree(entry, ignore_errors=True)
            cleaned += 1
    return cleaned