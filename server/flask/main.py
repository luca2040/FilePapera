# Disable warnings:
# file deepcode ignore RunWithDebugTrue: Server will not be started with debug=True in production

from app import create_app

app = create_app()

# This is just for debugging, so its not important to have relative paths
if __name__ == "__main__":
    app.config["TEMPLATES_AUTO_RELOAD"] = True
    app.run(
        debug=True,
        host="0.0.0.0",
        extra_files=[
            "/app/app/static/scripts/index/ui/functions.js",
            "/app/app/static/scripts/index/ui/ui.js",
            "/app/app/static/scripts/index/utils/api.js"
            "/app/app/static/scripts/index/utils/constants.js",
            "/app/app/static/scripts/index/utils/page.js",
            "/app/app/static/scripts/index/fileview.js",
            "/app/app/static/scripts/index/script.js",
            "/app/app/static/scripts/index/upload.js",
            "/app/app/static/scripts/login/script.js",
            "/app/app/static/styles/style.css",
        ],
    )
