import os
import shutil
import time
from flask import (
    Flask,
    Response,
    request,
    jsonify,
    render_template,
    send_from_directory,
    redirect
)
from flask_sockets import Sockets
from urllib.parse import unquote_plus
from app.FilenameEncoder import FilenameEncoder


app = Flask(__name__)
sockets = Sockets(app)


UPLOAD_FOLDER = "./uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

enc = FilenameEncoder(app.config["UPLOAD_FOLDER"])
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/")
def index():
    return redirect("/index")


@app.route("/index")
def index_html():
    return render_template("index.html")


@app.route("/favicon.ico")
def favicon():
    return send_from_directory("static", "icons/favicon.ico")


@app.route("/list", methods=["GET"])
def list_files_and_folders():
    folder = request.args.get("path", "")
    folder = folder.lstrip("/")

    try:
        folder = unquote_plus(folder)
        folder_path = os.path.join(app.config["UPLOAD_FOLDER"], folder)

        folder_path = enc.encode(folder_path)

        if not os.path.exists(folder_path):
            # Does not return 404 because it's not an error
            return jsonify({"not_found": True}), 200

        if os.path.isdir(folder_path):
            files = os.listdir(folder_path)
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
                        }
                    )

            folder_details.sort(key=lambda x: x["name"])
            file_details.sort(key=lambda x: x["name"])

            return jsonify({
                "files": (folder_details + file_details)
            }), 200

        return jsonify({"error": "Invalid folder"}), 400
    except Exception as _:
        return jsonify({"error": "Exception listing elements"}), 500


@app.route("/new/folder", methods=["GET"])
def create_folder():
    path = request.args.get("path", "")
    folder_name = request.args.get("name", None)

    if not folder_name:
        return jsonify({"error": "Folder name is required"}), 400

    try:
        path = unquote_plus(path)
        folder_name = unquote_plus(path)

        full_path = os.path.join(
            app.config["UPLOAD_FOLDER"], path, folder_name)
        full_path = enc.encode(full_path)

        os.makedirs(full_path, exist_ok=True)
        return jsonify({"message": "Folder created successfully"}), 200
    except Exception as _:
        return jsonify({"error": "Exception creating a folder"}), 500


@app.route("/new/file", methods=["POST"])
def upload_file():
    folder = request.args.get("folder", None)
    folder_path = app.config["UPLOAD_FOLDER"]

    try:
        if folder:
            folder = unquote_plus(folder)
            folder_path = os.path.join(folder_path, folder)

        os.makedirs(enc.encode(folder_path), exist_ok=True)

        if "file" not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files["file"]
        if not file:
            return jsonify({"error": "No file part"}), 400
        filename = file.filename

        final_file_path = os.path.join(folder_path, filename)
        final_file_path = enc.encode(final_file_path)

        with open(final_file_path, "wb") as f:
            while chunk := file.stream.read(262144):

                f.write(chunk)

        return jsonify({"message": "File uploaded successfully."}), 200
    except Exception as _:
        return jsonify({"error": "Exception uploading a file"}), 500


def generate_large_file(filepath):
    with open(filepath, "rb") as f:
        while chunk := f.read(262144):
            yield chunk


@app.route("/download", methods=["GET"])
def download_file():
    filepath = request.args.get("filepath", None)

    try:
        if not filepath:
            return jsonify({"error": "Filepath not provided"}), 400

        filepath = unquote_plus(filepath)

        if os.path.dirname(filepath):
            file_dir, filename = os.path.split(filepath)
            full_dir_path = os.path.join(app.config["UPLOAD_FOLDER"], file_dir)
        else:
            filename = filepath
            full_dir_path = app.config["UPLOAD_FOLDER"]

        full_file_path = os.path.join(full_dir_path, filename)
        full_file_path = enc.encode(full_file_path)

        if not os.path.isfile(full_file_path):
            return jsonify({"error": "File not found"}), 404

        file_size = os.path.getsize(full_file_path)

        return Response(
            generate_large_file(full_file_path),
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(file_size),
            },
            mimetype="application/octet-stream",
        )

    except Exception as _:
        return jsonify({"error": "Exception downloading"}), 500


@app.route("/delete", methods=["DELETE"])
def delete_file_or_folder():
    target = request.args.get("target", None)

    try:
        if not target:
            return jsonify({"error": "File or folder not found"}), 404

        target = unquote_plus(target)

        target_path = os.path.join(app.config["UPLOAD_FOLDER"], target)
        target_path = enc.encode(target_path)

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
