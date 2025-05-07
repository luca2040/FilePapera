from functools import wraps
from flask import session, redirect, jsonify
import hashlib


def login_required(is_API: bool = False):
    def decorator(f):
        @wraps(f)
        def decorated_func(*args, **kwargs):

            if not session.get("logged_in"):
                if is_API:
                    return jsonify({"error": "Unauthorized access."}), 401
                else:
                    return redirect("/login")

            return f(*args, **kwargs)

        return decorated_func

    return decorator


def check_password_hash_sha512(hash: str, psw: str) -> bool:
    hash2 = hashlib.sha512(psw.encode("UTF-8")).hexdigest()
    return hash2 == hash
