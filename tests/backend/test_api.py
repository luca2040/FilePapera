import hashlib
import io
import os
import zipfile


MAX_STORAGE = 10 * 1024 * 1024


def _upload(client, name="test.txt", content=b"hello world"):
    return client.post(
        "/upload/file?path=/",
        data={"file": (io.BytesIO(content), name)},
        content_type="multipart/form-data",
    )


def _file_names(listing):
    return [element["name"] for element in listing["files"]]


# ---------------------------------------------------------------------------
# /list
# ---------------------------------------------------------------------------


def test_list_root_empty(auth_client):
    response = auth_client.get("/list?path=/")
    assert response.status_code == 200
    assert response.get_json() == {"files": []}


def test_list_not_found_returns_flag(auth_client):
    response = auth_client.get("/list?path=/does-not-exist")
    assert response.status_code == 200
    assert response.get_json() == {"not_found": True}


def test_list_sorts_folders_first(auth_client):
    _upload(auth_client, "b.txt", b"x")
    auth_client.post("/new/folder?path=/&name=a-folder")

    listing = auth_client.get("/list?path=/").get_json()
    names = _file_names(listing)
    assert names == ["a-folder", "b.txt"]
    assert listing["files"][0]["file"] is False
    assert listing["files"][1]["file"] is True


# ---------------------------------------------------------------------------
# /new/folder
# ---------------------------------------------------------------------------


def test_create_folder_and_list(auth_client):
    response = auth_client.post("/new/folder?path=/&name=myfolder")
    assert response.status_code == 200

    listing = auth_client.get("/list?path=/").get_json()
    assert listing["files"][0]["name"] == "myfolder"
    assert listing["files"][0]["file"] is False


def test_create_folder_missing_name(auth_client):
    response = auth_client.post("/new/folder?path=/")
    assert response.status_code == 400


def test_create_folder_duplicate(auth_client):
    auth_client.post("/new/folder?path=/&name=dup")
    response = auth_client.post("/new/folder?path=/&name=dup")
    assert response.status_code == 409


# ---------------------------------------------------------------------------
# /upload/file
# ---------------------------------------------------------------------------


def test_upload_file(auth_client):
    content = b"hello world"
    response = _upload(auth_client, "hello.txt", content)
    assert response.status_code == 200
    assert response.get_json()["sha256"] == hashlib.sha256(content).hexdigest()

    listing = auth_client.get("/list?path=/").get_json()
    assert listing["files"][0]["name"] == "hello.txt"
    assert listing["files"][0]["file"] is True
    assert listing["files"][0]["size"] == len(content)


def test_upload_file_without_file(auth_client):
    response = auth_client.post("/upload/file?path=/")
    assert response.status_code == 400


def test_upload_file_into_subfolder(auth_client):
    auth_client.post("/new/folder?path=/&name=sub")
    response = _upload(auth_client, "sub/deep.txt", b"data")
    assert response.status_code == 200

    listing = auth_client.get("/list?path=/sub").get_json()
    assert listing["files"][0]["name"] == "deep.txt"


def test_upload_file_unicode_name(auth_client):
    response = _upload(auth_client, "café-ñ 1.txt", b"data")
    assert response.status_code == 200

    listing = auth_client.get("/list?path=/").get_json()
    assert listing["files"][0]["name"] == "café-ñ 1.txt"


# ---------------------------------------------------------------------------
# /upload/available-files
# ---------------------------------------------------------------------------


def test_available_files_detects_existing(auth_client):
    _upload(auth_client, "existing.txt", b"x")

    response = auth_client.post(
        "/upload/available-files",
        json={"data": [{"id": 1, "filepath": "/existing.txt"}], "size": 1},
    )
    data = response.get_json()
    assert data["storageError"] is False
    assert data["responseJSON"] == [
        {"id": 1, "isfolder": False, "isfile": True}
    ]


def test_available_files_detects_existing_folder(auth_client):
    auth_client.post("/new/folder?path=/&name=existing-dir")

    response = auth_client.post(
        "/upload/available-files",
        json={"data": [{"id": 2, "filepath": "/existing-dir"}], "size": 1},
    )
    data = response.get_json()
    assert data["storageError"] is False
    assert data["responseJSON"] == [
        {"id": 2, "isfolder": True, "isfile": False}
    ]


def test_available_files_reports_storage_error(auth_client):
    _upload(auth_client, "small.txt", b"x")  # uses 1 byte

    free_size = MAX_STORAGE - 1
    response = auth_client.post(
        "/upload/available-files", json={"data": [], "size": free_size}
    )
    data = response.get_json()
    assert data["storageError"] is True


# ---------------------------------------------------------------------------
# /reformat
# ---------------------------------------------------------------------------


def test_reformat_rename(auth_client):
    _upload(auth_client, "old.txt", b"x")

    response = auth_client.get(
        "/reformat?old_path=/old.txt&new_path=/new.txt"
    )
    assert response.status_code == 200

    listing = auth_client.get("/list?path=/").get_json()
    assert _file_names(listing) == ["new.txt"]


def test_reformat_move_into_folder(auth_client):
    _upload(auth_client, "file.txt", b"x")
    auth_client.post("/new/folder?path=/&name=dest")

    response = auth_client.get(
        "/reformat?old_path=/file.txt&new_path=/dest/file.txt"
    )
    assert response.status_code == 200

    listing = auth_client.get("/list?path=/dest").get_json()
    assert _file_names(listing) == ["file.txt"]


def test_reformat_same_path(auth_client):
    _upload(auth_client, "a.txt", b"x")

    response = auth_client.get(
        "/reformat?old_path=/a.txt&new_path=/a.txt"
    )
    assert response.status_code == 200


def test_reformat_target_already_exists(auth_client):
    _upload(auth_client, "a.txt", b"x")
    _upload(auth_client, "b.txt", b"y")

    response = auth_client.get(
        "/reformat?old_path=/a.txt&new_path=/b.txt"
    )
    assert response.status_code == 400


def test_reformat_missing_paths(auth_client):
    response = auth_client.get("/reformat")
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# /download
# ---------------------------------------------------------------------------


def test_download_file(auth_client):
    content = b"download me"
    _upload(auth_client, "dl.txt", content)

    response = auth_client.get("/download?filepath=/dl.txt")
    assert response.status_code == 200
    assert response.data == content
    assert "attachment" in response.headers["Content-Disposition"]


def test_download_missing_file(auth_client):
    response = auth_client.get("/download?filepath=/missing.txt")
    assert response.status_code == 404


def test_download_folder_as_zip(auth_client):
    auth_client.post("/new/folder?path=/&name=zipfolder")
    _upload(auth_client, "zipfolder/inner.txt", b"inside")

    response = auth_client.get("/download?filepath=/zipfolder")
    assert response.status_code == 200
    assert response.mimetype == "application/zip"

    with zipfile.ZipFile(io.BytesIO(response.data)) as zf:
        assert zf.read("inner.txt") == b"inside"


# ---------------------------------------------------------------------------
# /delete
# ---------------------------------------------------------------------------


def test_delete_file(auth_client):
    _upload(auth_client, "gone.txt", b"x")

    response = auth_client.delete("/delete?target=/gone.txt")
    assert response.status_code == 200

    listing = auth_client.get("/list?path=/").get_json()
    assert listing["files"] == []


def test_delete_folder(auth_client):
    auth_client.post("/new/folder?path=/&name=myfolder")
    _upload(auth_client, "myfolder/inside.txt", b"x")

    response = auth_client.delete("/delete?target=/myfolder")
    assert response.status_code == 200

    listing = auth_client.get("/list?path=/").get_json()
    assert listing["files"] == []


def test_delete_missing(auth_client):
    response = auth_client.delete("/delete?target=/nope")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# /storage
# ---------------------------------------------------------------------------


def test_storage(auth_client):
    data = auth_client.get("/storage").get_json()
    assert data["max_size"] == MAX_STORAGE

    _upload(auth_client, "s.txt", b"12345")

    data = auth_client.get("/storage").get_json()
    assert data["used_size"] == 5


# ---------------------------------------------------------------------------
# Path traversal / security
# ---------------------------------------------------------------------------


def test_download_path_traversal_never_escapes(auth_client):
    for payload in ["../../etc/passwd", "..%2F..%2Fetc%2Fpasswd"]:
        response = auth_client.get(f"/download?filepath={payload}")
        assert response.status_code != 200
        assert b"root:" not in response.data


# ---------------------------------------------------------------------------
# Chunked upload
# ---------------------------------------------------------------------------


def _initiate(auth_client, filename="test.bin", total_size=100, target_path="", expected_hash=None):
    payload = {"filename": filename, "total_size": total_size, "target_path": target_path}
    if expected_hash is not None:
        payload["expected_hash"] = expected_hash
    response = auth_client.post("/upload/initiate", json=payload)
    assert response.status_code == 200
    return response.get_json()


def test_chunked_upload_initiate(auth_client):
    data = _initiate(auth_client, "test.txt", 100)
    assert "upload_id" in data
    assert data["total_chunks"] == 1
    assert data["chunk_size"] == 5 * 1024 * 1024


def test_chunked_upload_single_chunk(auth_client):
    initiate = _initiate(auth_client, "small.txt", 11)
    upload_id = initiate["upload_id"]

    response = auth_client.post(
        f"/upload/chunk?upload_id={upload_id}&chunk_index=0",
        data=b"hello world",
        content_type="application/octet-stream",
    )
    assert response.status_code == 200
    assert response.get_json()["status"] == "uploaded"

    response = auth_client.post("/upload/complete", json={"upload_id": upload_id})
    assert response.status_code == 200
    assert response.get_json()["sha256"] == "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"


def test_chunked_upload_multiple_chunks(auth_client):
    # Use 1 MB chunks to fit within 10 MB max storage
    response = auth_client.post(
        "/upload/initiate",
        json={"filename": "big.bin", "total_size": 3 * 1024 * 1024, "target_path": "", "chunk_size": 1024 * 1024},
    )
    assert response.status_code == 200
    initiate = response.get_json()
    upload_id = initiate["upload_id"]
    assert initiate["total_chunks"] == 3

    chunk_size = initiate["chunk_size"]
    for i in range(3):
        start = i * chunk_size
        end = min(start + chunk_size, 3 * 1024 * 1024)
        chunk_data = os.urandom(end - start)
        response = auth_client.post(
            f"/upload/chunk?upload_id={upload_id}&chunk_index={i}",
            data=chunk_data,
            content_type="application/octet-stream",
        )
        assert response.status_code == 200

    response = auth_client.post("/upload/complete", json={"upload_id": upload_id})
    assert response.status_code == 200


def test_chunked_upload_status(auth_client):
    # Use a custom chunk size to force multiple chunks for a small file
    response = auth_client.post(
        "/upload/initiate",
        json={"filename": "status.txt", "total_size": 20, "target_path": "", "chunk_size": 10},
    )
    assert response.status_code == 200
    upload_id = response.get_json()["upload_id"]

    response = auth_client.get(f"/upload/status?upload_id={upload_id}")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "in_progress"
    assert data["progress"] == 0.0

    auth_client.post(
        f"/upload/chunk?upload_id={upload_id}&chunk_index=0",
        data=b"x" * 10,
        content_type="application/octet-stream",
    )

    response = auth_client.get(f"/upload/status?upload_id={upload_id}")
    data = response.get_json()
    assert data["progress"] == 50.0


def test_chunked_upload_cancel(auth_client):
    initiate = _initiate(auth_client, "cancel.txt", 100)
    upload_id = initiate["upload_id"]

    response = auth_client.post("/upload/cancel", json={"upload_id": upload_id})
    assert response.status_code == 200

    response = auth_client.get(f"/upload/status?upload_id={upload_id}")
    assert response.status_code == 404


def test_chunked_upload_hash_verification(auth_client):
    content = b"data to hash"
    expected = hashlib.sha256(content).hexdigest()
    initiate = _initiate(auth_client, "hash.txt", len(content), expected_hash=expected)
    upload_id = initiate["upload_id"]

    auth_client.post(
        f"/upload/chunk?upload_id={upload_id}&chunk_index=0",
        data=content,
        content_type="application/octet-stream",
    )

    response = auth_client.post("/upload/complete", json={"upload_id": upload_id})
    assert response.status_code == 200
    assert response.get_json()["sha256"] == expected

    # Wrong hash should fail
    wrong_hash = "0" * 64
    initiate2 = _initiate(auth_client, "hash2.txt", len(content), expected_hash=wrong_hash)
    upload_id2 = initiate2["upload_id"]
    auth_client.post(
        f"/upload/chunk?upload_id={upload_id2}&chunk_index=0",
        data=content,
        content_type="application/octet-stream",
    )
    response = auth_client.post("/upload/complete", json={"upload_id": upload_id2})
    assert response.status_code == 400
    assert "Hash mismatch" in response.get_json()["error"]


def test_chunked_upload_missing_chunks_fails(auth_client):
    initiate = _initiate(auth_client, "missing.txt", 30)
    upload_id = initiate["upload_id"]

    auth_client.post(
        f"/upload/chunk?upload_id={upload_id}&chunk_index=0",
        data=b"x" * 10,
        content_type="application/octet-stream",
    )
    # Skip chunk 1

    response = auth_client.post("/upload/complete", json={"upload_id": upload_id})
    assert response.status_code == 400
    assert "Missing chunks" in response.get_json()["error"]


def test_chunked_upload_storage_limit(auth_client):
    response = auth_client.post(
        "/upload/initiate",
        json={"filename": "huge.bin", "total_size": 10 * 1024 * 1024 + 1, "target_path": ""},
    )
    assert response.status_code == 507
    assert response.get_json()["storageError"] is True
