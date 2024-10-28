import os
from dotenv import load_dotenv

if not os.getenv("FLASK_ENV"):  # for development
    load_dotenv()

from app.Server import app

if __name__ == "__main__":
    app.run()
