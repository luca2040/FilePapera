FROM python:3.12.10-slim-bookworm

WORKDIR /app
ADD . /app

RUN apt-get update && apt-get install -y build-essential libpcre3-dev
RUN pip install -r requirements.txt

CMD ["uwsgi", "app.ini"]