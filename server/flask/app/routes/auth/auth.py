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
            return redirect("/index")
        else:
            flash("Wrong credentials", "error")

    return render_template("login.html")


@bp.route("/logout")
def logout():
    session.clear()
    return redirect("/login")
