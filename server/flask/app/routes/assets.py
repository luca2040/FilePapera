from flask_assets import Bundle, Environment


def compile_assets(app):
    assets = Environment(app)
    assets.directory = "app/static"
    assets.url = "/static"
    assets.manifest = "file"
    assets.cache = True
    assets.auto_build = True

    # Styles
    style_main_bundle = Bundle(
        "styles/style.css",
        filters="rcssmin",
        output="gen/style.min.css",
    )

    # External styles
    style_external_bundle = Bundle(
        "styles/external/dracula.css",
        "styles/external/font-awesome.all.min.css",
        filters=None,
        output="gen/style_external.min.css",
    )

    # Scripts
    js_main_bundle = Bundle(
        "scripts/index/ui.js",
        "scripts/index/script.js",
        filters="jsmin",
        output="gen/main.min.js",
    )

    js_login_bundle = Bundle(
        "scripts/login/script.js",
        filters="jsmin",
        output="gen/login.min.js",
    )

    # External Scripts
    js_external_bundle = Bundle(
        "scripts/external/highlight.min.js",
        "scripts/external/marked.min.js",
        "scripts/external/purify.min.js",
        filters=None,
        output="gen/main_external.min.js",
    )

    # Copy to gen folder the fonts

    assets.register("main_styles", style_main_bundle)
    assets.register("external_styles", style_external_bundle)

    assets.register("main_scripts", js_main_bundle)
    assets.register("login_scripts", js_login_bundle)
    assets.register("external_scripts", js_external_bundle)

    style_main_bundle.build(force=True)
    style_external_bundle.build(force=True)

    js_main_bundle.build(force=True)
    js_login_bundle.build(force=True)
    js_external_bundle.build(force=True)
