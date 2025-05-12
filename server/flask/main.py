# Disable warnings:
# file deepcode ignore RunWithDebugTrue: Server will not be started with debug=True in production

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
