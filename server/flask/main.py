# Disable warnings:
# file deepcode ignore RunWithDebugTrue: Server will not be started with debug=True in production

from app import create_app

app = create_app()

# This is just for debugging, so its not important to have relative paths
if __name__ == "__main__":
    app.config["TEMPLATES_AUTO_RELOAD"] = True
    # Frontend assets are rebuilt automatically by Flask-Assets (auto_build),
    # so no extra files are needed here to trigger restarts.
    app.run(debug=True, host="0.0.0.0")
