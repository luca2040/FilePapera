import os
from flask import Flask
from .utils.FilenameEncoder import FilenameEncoder
from .utils.Translations import Translations


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

    translations_obj = Translations("./app/lang", app.config["DEFAULT_LANG"])
    translations_obj.load()

    app.config["TRANSLATIONS_OBJ"] = translations_obj

    compile_assets(app)

    app.register_blueprint(auth.bp)
    app.register_blueprint(api.bp)

    routes.register_routes(app)

    return app
