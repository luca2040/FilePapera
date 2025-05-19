from flask import (
    Blueprint,
    current_app,
    request,
    session,
    redirect,
    render_template,
    flash,
)
from .auth_utils import check_password_hash_sha512


bp = Blueprint("auth", __name__)


@bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        if (username == current_app.config["USERNAME"]) and check_password_hash_sha512(
            current_app.config["PASSWORD_HASH"], password
        ):

            session["logged_in"] = True

            # [TODO] Need to change only this for multi user, it defaults to this if lang is not in url parameters
            session["lang"] = current_app.config["DEFAULT_LANG"]

            return redirect("/index")
        else:
            flash("Wrong credentials", "error")

    translations_obj = current_app.config["TRANSLATIONS_OBJ"]
    lang = request.args.get(
        "lang",
        session["lang"] if session.get("lang") else current_app.config["DEFAULT_LANG"],
    )
    return render_template("login.html", translations=translations_obj.get(lang))


@bp.route("/logout")
def logout():
    session.clear()
    return redirect("/login")
