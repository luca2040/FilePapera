import os
import hashlib

from app.Server import app


def check_valid_path(path: str) -> bool:
    return (
        os.path.commonprefix(
            (os.path.realpath(path), app.config["COMPLETE_UPLOAD_FOLDER"])
        )
        != app.config["COMPLETE_UPLOAD_FOLDER"]
    )


def check_password_hash(hash: str, psw: str) -> bool:
    hash2 = hashlib.sha512(psw.encode("UTF-8")).hexdigest()
    return hash2 == hash
