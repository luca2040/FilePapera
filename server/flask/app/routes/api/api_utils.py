from typing import Tuple

import os
from pathlib import Path
from flask import current_app


def get_storage_size() -> Tuple[int, int]:
    """
    Returns:
        int: Max size in bytes
        int: Used storage in bytes
    """

    max_size = current_app.config["MAX_STORAGE"]
    enc = current_app.config["FILENAME_ENCODER"]

    enc_path = enc.encode(current_app.config["UPLOAD_FOLDER"])
    dir = Path(enc_path)
    size = sum(f.stat().st_size for f in dir.glob("**/*") if f.is_file())

    return max_size, size


def list_dir(folder_path):
    return [entry.name for entry in os.scandir(folder_path)]


def check_valid_path(path: str) -> bool:
    return (
        os.path.commonprefix(
            (os.path.realpath(path), current_app.config["COMPLETE_UPLOAD_FOLDER"])
        )
        != current_app.config["COMPLETE_UPLOAD_FOLDER"]
    )


def generate_large_file(filepath):
    with open(filepath, "rb") as f:
        while chunk := f.read(262144):
            yield chunk
