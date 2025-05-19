from flask import (
    render_template,
    redirect,
    send_from_directory,
    current_app,
    request,
    session,
)

from .auth.auth_utils import login_required


def register_routes(app):

    @app.errorhandler(404)
    def page_not_found(e):
        return redirect("/index?notfound=true")

    @app.route("/")
    @login_required()
    def index():
        return redirect("/index")

    @app.route("/index")
    @login_required()
    def index_html():
        translations_obj = current_app.config["TRANSLATIONS_OBJ"]
        lang = request.args.get(
            "lang",
            (
                session["lang"]
                if session.get("lang")
                else current_app.config["DEFAULT_LANG"]
            ),
        )
        return render_template("index.html", translations=translations_obj.get(lang))

    @app.route("/favicon.ico")
    def favicon():
        return send_from_directory("static", "icons/favicon.ico")

    # For static font files

    @app.route("/static/gen/fa-solid-900.woff2")
    def font_1():
        return send_from_directory("static", "styles/external/fa-solid-900.woff2")

    @app.route("/static/gen/fa-solid-900.ttf")
    def font_2():
        return send_from_directory("static", "styles/external/fa-solid-900.ttf")
