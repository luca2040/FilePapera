from flask import Flask, request, jsonify, abort, render_template, Response
from urllib.parse import unquote_plus
from flask_sockets import Sockets
from app.FilenameEncoder import FilenameEncoder
import os
import shutil


app = Flask(__name__)
sockets = Sockets(app)


UPLOAD_FOLDER = './uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

enc = FilenameEncoder(app.config['UPLOAD_FOLDER'])
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/")
def index():
    return render_template("index.html")

# NEEDS CHANGES


@app.route('/list', methods=['GET'])
def list_files_and_folders():
    folder = request.args.get('path', '')
    folder_path = os.path.join(app.config['UPLOAD_FOLDER'], folder)

    folder_path = enc.encode(folder_path)

    if not os.path.exists(folder_path):
        abort(404, description="Folder not found")

    if os.path.isdir(folder_path):
        files = os.listdir(folder_path)
        files = [enc.decode(f) for f in files]
        return jsonify({"files": files}), 200

    return jsonify({"error": "Invalid folder"}), 400


@app.route('/new/folder', methods=['GET'])
def create_folder():
    path = request.args.get("path", "")
    folder_name = request.args.get("name", None)

    if not folder_name:
        return jsonify({"error": "Folder name is required"}), 400

    try:
        path = unquote_plus(path)
        folder_name = unquote_plus(path)

        full_path = os.path.join(
            app.config['UPLOAD_FOLDER'],
            path,
            folder_name)
        full_path = enc.encode(full_path)

        os.makedirs(full_path, exist_ok=True)
        return jsonify({"message": "Folder created successfully"}), 200
    except Exception as _:
        return jsonify({"error": "Exception creating a folder"}), 500


@app.route('/new/file', methods=['POST'])
def upload_file():
    folder = request.args.get("folder", None)
    folder_path = app.config['UPLOAD_FOLDER']

    try:
        if folder:
            folder = unquote_plus(folder)
            folder_path = os.path.join(folder_path, folder)

        os.makedirs(enc.encode(folder_path), exist_ok=True)

        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files['file']
        if not file:
            return jsonify({"error": "No file part"}), 400
        filename = file.filename

        final_file_path = os.path.join(folder_path, filename)
        final_file_path = enc.encode(final_file_path)

        with open(final_file_path, 'wb') as f:
            while chunk := file.stream.read(262144):

                f.write(chunk)

        return jsonify({"message": "File uploaded successfully."}), 200
    except Exception as _:
        return jsonify({"error": "Exception uploading a file"}), 500


def generate_large_file(filepath):
    with open(filepath, 'rb') as f:
        while chunk := f.read(262144):
            yield chunk


@app.route('/download', methods=['GET'])
def download_file():
    filepath = request.args.get("filepath", None)

    try:
        if not filepath:
            abort(400, description="Filepath not provided")

        filepath = unquote_plus(filepath)

        if os.path.dirname(filepath):
            file_dir, filename = os.path.split(filepath)
            full_dir_path = os.path.join(app.config['UPLOAD_FOLDER'], file_dir)
        else:
            filename = filepath
            full_dir_path = app.config['UPLOAD_FOLDER']

        full_file_path = os.path.join(full_dir_path, filename)
        full_file_path = enc.encode(full_file_path)

        if not os.path.isfile(full_file_path):
            abort(404, description="File not found")

        file_size = os.path.getsize(full_file_path)

        return Response(generate_large_file(full_file_path),
                        headers={
                            "Content-Disposition": f"attachment; filename={filename}",
                            "Content-Length": str(file_size)},
                        mimetype='application/octet-stream')

    except Exception as _:
        abort(500, description="Exception downloading")


@app.route('/delete', methods=['DELETE'])
def delete_file_or_folder():
    target = request.args.get("target", None)

    try:
        if not target:
            abort(404, description="File or folder not found")

        target = unquote_plus(target)

        target_path = os.path.join(app.config['UPLOAD_FOLDER'], target)
        target_path = enc.encode(target_path)

        if not os.path.exists(target_path):
            abort(404, description="File or folder not found")

        if os.path.isfile(target_path):
            os.remove(target_path)
            return jsonify({"message": f"File deleted successfully"}), 200

        elif os.path.isdir(target_path):
            shutil.rmtree(target_path)
            return jsonify({"message": f"Folder deleted successfully"}), 200

        return jsonify({"error": "Unknown error"}), 400
    except Exception as _:
        return jsonify({"error": "Exception deleting file"}), 500
