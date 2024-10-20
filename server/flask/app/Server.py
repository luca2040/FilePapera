import os
import shutil
from typing import Tuple
import zipstream
import hashlib
import time
from flask import (
    Flask,
    Response,
    request,
    jsonify,
    render_template,
    send_from_directory,
    redirect,
    session,
    flash
)
from flask_sockets import Sockets
from urllib.parse import unquote_plus
from urllib.parse import quote
from pathlib import Path
from app.FilenameEncoder import FilenameEncoder
from functools import wraps


app = Flask(__name__)
sockets = Sockets(app)


app.config["UPLOAD_FOLDER"] = os.getenv("UPLOAD_FOLDER")
app.config["COMPLETE_UPLOAD_FOLDER"] = os.getenv("COMPLETE_UPLOAD_FOLDER")
app.config["MAX_STORAGE"] = int(os.getenv("MAX_STORAGE"))

app.secret_key = os.getenv('FLASK_SECRET_KEY')
app.config["USERNAME"] = os.getenv('USERNAME')
app.config["PASSWORD_HASH"] = os.getenv('PASSWORD_HASH')

enc = FilenameEncoder(app.config["UPLOAD_FOLDER"])
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)


def check_valid_path(path: str) -> bool:
    return os.path.commonprefix((os.path.realpath(path), app.config["COMPLETE_UPLOAD_FOLDER"])) != app.config["COMPLETE_UPLOAD_FOLDER"]


def check_password_hash(hash: str, psw: str) -> bool:
    hash2 = hashlib.sha512(psw.encode("UTF-8")).hexdigest()
    return hash2 == hash


def login_required(f):
    @wraps(f)
    def decorated_func(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect("/login")
        return f(*args, **kwargs)

    return decorated_func


def login_required_API(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({"error": "Unauthorized access."}), 401
        return f(*args, **kwargs)

    return decorated_function


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        if (username == app.config["USERNAME"]
                ) and check_password_hash(app.config["PASSWORD_HASH"], password):

            session['logged_in'] = True
            return redirect("/index")
        else:
            flash('Credenziali errate', 'error')

    return render_template('login.html')


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")


def get_storage_size() -> Tuple[int, int]:
    """
    Returns:
        int: Max size in bytes

        int: Used storage in bytes
    """

    max_size = app.config["MAX_STORAGE"]

    enc_path = enc.encode(app.config["UPLOAD_FOLDER"])
    dir = Path(enc_path)
    size = sum(f.stat().st_size for f in dir.glob("**/*") if f.is_file())

    return max_size, size


@app.errorhandler(404)
def page_not_found(e):
    return redirect("/index?notfound=true")


@app.route("/")
@login_required
def index():
    return redirect("/index")


@app.route("/index")
@login_required
def index_html():
    return render_template("index.html")


@app.route("/favicon.ico")
def favicon():
    return send_from_directory("static", "icons/favicon.ico")


def list_dir(folder_path):
    return [entry.name for entry in os.scandir(folder_path)]


@app.route("/list", methods=["GET"])
@login_required_API
def list_files_and_folders():
    folder = request.args.get("path", "")
    folder = folder.lstrip("/")

    try:
        os.sync()

        folder = unquote_plus(folder)
        folder_path = os.path.join(app.config["UPLOAD_FOLDER"], folder)

        folder_path = enc.encode(folder_path)

        if not os.path.exists(folder_path):
            # Does not return 404 because it's not an error
            return jsonify({"not_found": True}), 200

        if os.path.isdir(folder_path):
            files = list_dir(folder_path)
            file_details = []
            folder_details = []

            for f in files:
                decoded_file = enc.decode(f)
                full_path = os.path.join(folder_path, f)

                if os.path.isdir(full_path):
                    creation_time = os.path.getctime(full_path)
                    readable_creation_time = time.strftime(
                        "%Y-%m-%d", time.localtime(creation_time)
                    )

                    folder_details.append(
                        {
                            "name": decoded_file,
                            "size": None,
                            "file": False,
                            "creation_date": readable_creation_time,
                            "path": "/"
                            + enc.decode(full_path).replace(app.config["UPLOAD_FOLDER"], "", 1).lstrip("/"),
                        }
                    )
                else:
                    file_size = os.path.getsize(full_path)
                    creation_time = os.path.getctime(full_path)
                    readable_creation_time = time.strftime(
                        "%Y-%m-%d", time.localtime(creation_time)
                    )
                    file_details.append(
                        {
                            "name": decoded_file,
                            "size": file_size,
                            "file": True,
                            "creation_date": readable_creation_time,
                            "path": "/"
                            + enc.decode(full_path).replace(app.config["UPLOAD_FOLDER"], "", 1).lstrip("/"),
                        }
                    )

            folder_details.sort(key=lambda x: x["name"])
            file_details.sort(key=lambda x: x["name"])

            return jsonify({"files": (folder_details + file_details)}), 200

        return jsonify({"error": "Invalid folder"}), 400
    except Exception as _:
        return jsonify({"error": "Exception listing elements"}), 500


@app.route("/new/folder", methods=["POST"])
@login_required_API
def create_folder():
    path = request.args.get("path", "")
    folder_name = request.args.get("name", None)

    if not folder_name:
        return jsonify({"error": "Folder name is required", "type": 1}), 400

    try:
        path = unquote_plus(path).lstrip("/")
        folder_name = unquote_plus(folder_name).lstrip("/")

        full_path = os.path.join(
            app.config["UPLOAD_FOLDER"], path, folder_name)
        full_path = enc.encode(full_path)

        if os.path.exists(full_path) and os.path.isdir(full_path):
            return jsonify({"error": "Folder already exists", "type": 2}), 409

        os.makedirs(full_path, exist_ok=False)
        return jsonify({"message": "Folder created successfully"}), 200
    except Exception as _:
        return jsonify({"error": "Exception creating folder", "type": 3}), 500


@app.route("/upload/file", methods=["POST"])
@login_required_API
def upload_file():
    path = request.args.get("path", "")

    try:
        path = unquote_plus(path).lstrip("/")
        full_path = os.path.join(app.config["UPLOAD_FOLDER"], path)

        os.makedirs(enc.encode(full_path), exist_ok=True)

        if "file" not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files["file"]
        if not file:
            return jsonify({"error": "No file part"}), 400
        filename = file.filename

        final_file_path = os.path.join(full_path, filename)
        final_file_path = enc.encode(final_file_path)

        if check_valid_path(final_file_path):
            return jsonify({"message": "Invalid path"}), 403

        sha256_hash = hashlib.sha256()

        os.makedirs(os.path.dirname(final_file_path), exist_ok=True)

        with open(final_file_path, "wb") as f:
            while chunk := file.stream.read(262144):
                f.write(chunk)
                sha256_hash.update(chunk)

        received_hash = sha256_hash.hexdigest()

        return jsonify({"message": "File uploaded successfully.", "sha256": received_hash}), 200
    except Exception as _:
        return jsonify({"error": "Exception uploading file"}), 500


@app.route("/upload/available-files", methods=['POST'])
@login_required_API
def available_files():
    try:
        data = request.get_json()
        # {data: [{id: int, filepath: str}, ...]}, size: int (Total bytes)}

        responseList = []
        # [{id: int, isfolder: boolean, isfile: boolean}]
        size_error = False

        new_files_size = data["size"]
        max_size, used_size = get_storage_size()
        free_size = max_size - used_size

        if (new_files_size >= free_size):
            size_error = True
        else:
            for element in data["data"]:
                remotePath = element["filepath"]
                serverPath = os.path.join(
                    app.config["UPLOAD_FOLDER"], remotePath.lstrip("/"))
                serverPath = enc.encode(serverPath)

                if os.path.exists(serverPath):
                    if os.path.isfile(serverPath):
                        responseList.append(
                            {"id": element["id"], "isfolder": False, "isfile": True})
                    else:
                        responseList.append(
                            {"id": element["id"], "isfolder": True, "isfile": False})

        response = {
            'message': 'done',
            'storageError': size_error,
            'responseJSON': responseList
        }

        return jsonify(response), 200

    except Exception as _:
        return jsonify({"error": "Exception checking files"}), 500


@app.route("/reformat", methods=["GET"])
@login_required_API
def rename_or_move():
    old_path = request.args.get("old_path", None)
    new_path = request.args.get("new_path", None)

    if new_path == old_path:
        return jsonify({"message": "Same path"}), 200

    if not old_path or not new_path:
        return (
            jsonify({"error": "'old_path' and/or 'new_path' missing", "type": 1}),
            400,
        )

    try:
        old_path = unquote_plus(old_path)
        new_path = unquote_plus(new_path)
        old_path = os.path.join(
            app.config["UPLOAD_FOLDER"], old_path.lstrip("/"))
        new_path = os.path.join(
            app.config["UPLOAD_FOLDER"], new_path.lstrip("/"))
        old_path = enc.encode(old_path)
        new_path = enc.encode(new_path)

        if check_valid_path(old_path) or check_valid_path(new_path):
            return jsonify({"message": "Invalid path"}), 403

        if not os.path.exists(old_path):
            return jsonify({"error": "File not found", "type": 2}), 404

        if os.path.exists(new_path):
            return (
                jsonify(
                    {
                        "error": "A file or directory with the new name already exists",
                        "type": 3,
                    }
                ),
                400,
            )

        os.rename(old_path, new_path)

        return jsonify({"message": "File or directory renamed/moved"}), 200

    except Exception as e:
        return (
            jsonify({"error": f"Exception moving/renaming folder/file", "type": 4}),
            500,
        )


def generate_large_file(filepath):
    with open(filepath, "rb") as f:
        while chunk := f.read(262144):
            yield chunk


@app.route("/download", methods=["GET"])
@login_required_API
def download_file():
    filepath = request.args.get("filepath", None)
    pdf = request.args.get("pdf", False)

    try:
        if not filepath:
            return jsonify({"error": "Filepath not provided"}), 400

        filepath = unquote_plus(filepath)
        filepath = filepath.lstrip("/")

        if os.path.dirname(filepath):
            file_dir, filename = os.path.split(filepath)
            full_dir_path = os.path.join(app.config["UPLOAD_FOLDER"], file_dir)
        else:
            filename = filepath
            full_dir_path = app.config["UPLOAD_FOLDER"]

        full_file_path = os.path.join(full_dir_path, filename)
        full_file_path = enc.encode(full_file_path)

        if check_valid_path(full_file_path):
            return jsonify({"message": "Invalid path"}), 403

        if os.path.isdir(full_file_path):

            def generator():
                z = zipstream.ZipFile(
                    mode="w", compression=zipstream.ZIP_DEFLATED, allowZip64=True)

                for root, dirs, files in os.walk(full_file_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, full_file_path)

                        z.write(file_path, arcname=enc.decode(arcname))

                for chunk in z:
                    yield chunk

            encoded_filename = quote(filename)

            return Response(
                generator(),
                headers={
                    "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}.zip",
                },
                mimetype="application/zip",
            )

        if not os.path.isfile(full_file_path):
            return jsonify({"error": "File not found"}), 404

        file_size = os.path.getsize(full_file_path)

        encoded_filename = quote(filename)

        # This is bad but is the simplest thing.
        if not pdf:
            return Response(
                generate_large_file(full_file_path),
                headers={
                    "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
                    "Content-Length": str(file_size),
                },
                mimetype="application/octet-stream",
            )
        else:
            return Response(
                generate_large_file(full_file_path),
                headers={
                    "Content-Disposition": f"inline; filename*=UTF-8''{encoded_filename}",
                    "Content-Length": str(file_size),
                },
                mimetype="application/pdf",
            )

    except Exception as _:
        return jsonify({"error": "Exception downloading"}), 500


@app.route("/delete", methods=["DELETE"])
@login_required_API
def delete_file_or_folder():
    target = request.args.get("target", None)

    try:
        if not target:
            return jsonify({"error": "File or folder not found"}), 404

        target = unquote_plus(target).lstrip("/")

        target_path = os.path.join(app.config["UPLOAD_FOLDER"], target)
        target_path = enc.encode(target_path)

        if check_valid_path(target_path):
            return jsonify({"message": "Invalid path"}), 403

        if not os.path.exists(target_path):
            return jsonify({"error": "File or folder not found"}), 404

        if os.path.isfile(target_path):
            os.remove(target_path)
            return jsonify({"message": f"File deleted successfully"}), 200

        elif os.path.isdir(target_path):
            shutil.rmtree(target_path)
            return jsonify({"message": f"Folder deleted successfully"}), 200

        return jsonify({"error": "Unknown error"}), 400
    except Exception as _:
        return jsonify({"error": "Exception deleting file"}), 500


@app.route("/storage", methods=["GET"])
@login_required_API
def get_storage():
    try:
        max_size, size = get_storage_size()

        return jsonify({"used_size": size, "max_size": max_size}), 200
    except Exception as _:
        return jsonify({"error": "Exception getting used storage"}), 500
