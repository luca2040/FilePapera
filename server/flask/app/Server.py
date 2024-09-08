from flask import Flask, request, send_from_directory, jsonify, abort, render_template
from flask_sockets import Sockets
import os
import threading
from app.ServerAPI import api


app = Flask(__name__)
app.register_blueprint(api)
sockets = Sockets(app)


# Set the upload folder
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
MERGING_STATUS = {}


os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/")
def index():
    return render_template("index.html")


def merge_chunks(file_name, folder_path, total_chunks):
    try:
        file_path = os.path.join(folder_path, file_name)
        with open(file_path, 'wb') as outfile:
            for i in range(total_chunks):
                chunk_path = os.path.join(folder_path, f"{file_name}.part{i}")
                with open(chunk_path, 'rb') as infile:
                    outfile.write(infile.read())
                os.remove(chunk_path)  # Remove chunk file after combining
                MERGING_STATUS[file_name] = int((i / total_chunks) * 100)
        MERGING_STATUS[file_name] = 100  # Mark as completed
    except Exception as e:
        print(f"Error during merging: {e}")
        MERGING_STATUS[file_name] = -1  # Error status


@app.route('/upload/<path:folder>', methods=['POST'])
def upload_file(folder):
    folder_path = os.path.join(app.config['UPLOAD_FOLDER'], folder)
    # Create folder if it doesn't exist
    os.makedirs(folder_path, exist_ok=True)

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    chunk = request.form.get('chunk', type=int)
    total_chunks = request.form.get('totalChunks', type=int)

    if not file:
        return jsonify({"error": "No file part"}), 400

    filename = file.filename
    temp_file_path = os.path.join(folder_path, f"{filename}.part{chunk}")

    # Save the chunk
    file.save(temp_file_path)

    # Check if all chunks are uploaded
    chunk_files = [f for f in os.listdir(
        folder_path) if f.startswith(filename + '.part')]
    if len(chunk_files) == total_chunks:
        # Start merging chunks in a separate thread
        MERGING_STATUS[filename] = 0  # Set initial merging status
        merging_thread = threading.Thread(
            target=merge_chunks, args=(filename, folder_path, total_chunks))
        merging_thread.start()
        return jsonify({"message": f"File {filename} uploaded successfully, merging in progress."}), 200

    return jsonify({"message": f"Chunk {chunk} uploaded successfully"}), 200


@app.route('/merge_status/<filename>', methods=['GET'])
def merge_status(filename):
    status = MERGING_STATUS.get(filename, 0)
    print(f"Merge status for {filename}: {status}")  # Debugging line
    return jsonify({"status": status}), 200


@app.route('/download/<path:filepath>', methods=['GET'])
def download_file(filepath):
    file_dir, filename = os.path.split(filepath)
    dir_path = os.path.join(app.config['UPLOAD_FOLDER'], file_dir)

    if not os.path.exists(os.path.join(dir_path, filename)):
        abort(404, description="File not found")

    return send_from_directory(dir_path, filename, as_attachment=True)


@app.route('/delete/<path:target>', methods=['DELETE'])
def delete_file_or_folder(target):
    target_path = os.path.join(app.config['UPLOAD_FOLDER'], target)

    if not os.path.exists(target_path):
        abort(404, description="File or folder not found")

    if os.path.isfile(target_path):
        os.remove(target_path)
        return jsonify({"message": f"File {target} deleted successfully"}), 200

    elif os.path.isdir(target_path):
        os.rmdir(target_path)  # Only deletes empty folders
        return jsonify({"message": f"Folder {target} deleted successfully"}), 200

    return jsonify({"error": "Unknown error"}), 400


@app.route('/list/<path:folder>', methods=['GET'])
def list_files_and_folders(folder):
    folder_path = os.path.join(app.config['UPLOAD_FOLDER'], folder)

    if not os.path.exists(folder_path):
        abort(404, description="Folder not found")

    if os.path.isdir(folder_path):
        files = os.listdir(folder_path)
        return jsonify({"files": files}), 200

    return jsonify({"error": "Invalid folder"}), 400
