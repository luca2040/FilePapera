import os
from flask_assets import Bundle, Environment


def compile_assets(app):
    static_dir = os.path.join(os.path.dirname(__file__), "..", "static")

    assets = Environment(app)
    assets.directory = os.path.abspath(static_dir)
    assets.url = "/static"
    assets.manifest = "file"
    assets.cache = True
    assets.auto_build = True
    # Hash-version the bundle URLs so the browser gets a fresh URL after a rebuild
    assets.version = "hash"

    # Styles
    style_main_bundle = Bundle(
        "styles/style.css",
        filters="rcssmin",
        output="gen/style.min.css",
    )

    # External styles
    style_external_bundle = Bundle(
        "styles/external/*.css",
        filters=None,
        output="gen/style_external.min.css",
    )

    # Scripts
    js_main_bundle = Bundle(
        "scripts/index/*.js",
        "scripts/index/ui/*.js",
        "scripts/index/utils/*.js",
        filters="jsmin",
        output="gen/main.min.js",
    )

    js_login_bundle = Bundle(
        "scripts/login/*.js",
        filters="jsmin",
        output="gen/login.min.js",
    )

    # External Scripts
    js_external_bundle = Bundle(
        "scripts/external/*.js",
        filters=None,
        output="gen/main_external.min.js",
    )

    assets.register("main_styles", style_main_bundle)
    assets.register("external_styles", style_external_bundle)
    assets.register("main_scripts", js_main_bundle)
    assets.register("login_scripts", js_login_bundle)
    assets.register("external_scripts", js_external_bundle)

    # Force an initial build at startup so the files are ready for the first
    # request, but skip it while running the test suite.
    if os.environ.get("TESTING") != "1":
        for bundle in (
            style_main_bundle,
            style_external_bundle,
            js_main_bundle,
            js_login_bundle,
            js_external_bundle,
        ):
            bundle.build(force=True)
