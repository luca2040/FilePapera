import os
from dotenv import load_dotenv

load_dotenv()

UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER")
COMPLETE_UPLOAD_FOLDER = os.getenv("COMPLETE_UPLOAD_FOLDER")
MAX_STORAGE = int(os.getenv("MAX_STORAGE"))

FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY")
USERNAME = os.getenv("USERNAME")
PASSWORD_HASH = os.getenv("PASSWORD_HASH")

DEFAULT_LANG = os.getenv("DEFAULT_LANG")
