import hashlib
import os
import shutil
import sys
import tempfile
from pathlib import Path

import pytest


def _app_dir() -> str:
    """Location of the flask source. In the container it is /app, otherwise it is
    derived from this file's location."""
    env_dir = os.environ.get("APP_DIR")
    if env_dir:
        return env_dir
    return str(Path(__file__).resolve().parents[2] / "server" / "flask")


APP_DIR = _app_dir()
sys.path.insert(0, APP_DIR)

UPLOAD_DIR = tempfile.mkdtemp(prefix="filepapera-tests-")

# These must be set before the app module is imported, because config.py reads
# them at import time.
os.environ["TESTING"] = "1"
os.environ["FLASK_SECRET_KEY"] = "test-secret-key"
os.environ["USERNAME"] = "admin"
os.environ["PASSWORD_HASH"] = hashlib.sha512(b"password").hexdigest()
os.environ["DEFAULT_LANG"] = "en"
os.environ["MAX_STORAGE"] = str(10 * 1024 * 1024)
os.environ["UPLOAD_FOLDER"] = UPLOAD_DIR
os.environ["COMPLETE_UPLOAD_FOLDER"] = UPLOAD_DIR + os.sep


def pytest_sessionfinish(session, exitstatus):
    if os.path.isdir(UPLOAD_DIR):
        shutil.rmtree(UPLOAD_DIR, ignore_errors=True)


@pytest.fixture
def app():
    from app import create_app

    app = create_app()
    app.config.update(TESTING=True)
    return app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_client(client):
    response = client.post(
        "/login", data={"username": "admin", "password": "password"}
    )
    assert response.status_code == 302
    return client


@pytest.fixture(autouse=True)
def _clean_uploads():
    yield
    if os.path.isdir(UPLOAD_DIR):
        for entry in os.scandir(UPLOAD_DIR):
            path = entry.path
            if entry.is_dir() and not entry.is_symlink():
                shutil.rmtree(path, ignore_errors=True)
            else:
                try:
                    os.remove(path)
                except OSError:
                    pass
