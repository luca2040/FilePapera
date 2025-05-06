#!/bin/bash

if [ "$ENV" = "production" ]; then
    echo "Launching in production mode"
    exec uwsgi app.ini
else
    echo "Developing mode"
    exec python /app/main.py
fi
