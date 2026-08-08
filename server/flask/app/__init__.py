import os
import threading
import time
from flask import Flask
from .utils.FilenameEncoder import FilenameEncoder
from .utils.Translations import Translations


def _periodic_cleanup(app, interval=3600):
    with app.app_context():
        from .routes.api.api_chunked import cleanup_expired_uploads
        while True:
            time.sleep(interval)
            try:
                cleaned = cleanup_expired_uploads()
                if cleaned:
                    app.logger.info(f"Cleaned up {cleaned} expired partial uploads")
            except Exception as e:
                app.logger.error(f"Partial upload cleanup failed: {e}")


def create_app():
    app = Flask(__name__)
    app.config.from_object("config")

    from .routes.assets import compile_assets
    from .routes import routes
    from .routes.auth import auth
    from .routes.api import api

    app.secret_key = app.config["FLASK_SECRET_KEY"]

    app.config["FILENAME_ENCODER"] = FilenameEncoder(app.config["UPLOAD_FOLDER"])
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    translations_obj = Translations(
        os.path.join(os.path.dirname(__file__), "lang"),
        app.config["DEFAULT_LANG"],
    )
    translations_obj.load()

    app.config["TRANSLATIONS_OBJ"] = translations_obj

    # Registers the bundles and the Jinja "assets" tag (the initial build is
    # skipped while running the test suite).
    compile_assets(app)

    app.register_blueprint(auth.bp)
    app.register_blueprint(api.bp)

    routes.register_routes(app)

    if os.environ.get("TESTING") != "1":
        cleanup_thread = threading.Thread(target=_periodic_cleanup, args=(app,), daemon=True)
        cleanup_thread.start()

    return app
