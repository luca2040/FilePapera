<p align="center">
<img src="https://github.com/user-attachments/assets/7fd9bd1e-904c-4380-b5d0-d02d40ba9cfc" 
        alt="FilePapera"
        style="display: block; margin: 0 auto" />
</p>

## Simple file upload server

This is a file upload server where you can upload files.

[Example](https://github.com/user-attachments/assets/0a14a04a-6a15-49cd-ac18-dd2e28d583c8)

It also supports uploading multiple files at once, uploading folders and uploading files and folders by drag-and-drop.<br/>

---

File preview is supported for the most used file types like images, PDF, text files, programming languages, markdown:

![Example](https://github.com/user-attachments/assets/23240c12-9cec-4eeb-8768-9441c3dabf1b)

## Usage

You can run this server by using the docker image.<br/>
The uploads folder path can be configured in the `compose.yml` file.<br/><br/>
`compose.yml`:<br/>

```yaml
version: "3.7"

services:
  upload_server:
    image: ghcr.io/luca2040/filepapera:latest
    container_name: upload_server
    restart: always
    env_file:
      - .env
    volumes:
      - ./uploads:/app/uploads:rw
    expose:
      - 8080

  nginx:
    image: nginx:latest
    container_name: nginx
    restart: always
    ports:
      - 80:80
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
```

`config/nginx.conf`:<br/>

```nginx
events{}

http{

    server {

        listen 80;

        client_max_body_size 500G;

        location / {
            include uwsgi_params;
            uwsgi_pass upload_server:8080;
        }

    }

}
```

`.env`:<br/>

```sh
# Upload folder in the container
UPLOAD_FOLDER=/app/uploads
# The same but ending in / to check the path
COMPLETE_UPLOAD_FOLDER=/app/uploads/ 
# Example 10Gb max storage
MAX_STORAGE=10737418240

# Flask secret key
FLASK_SECRET_KEY=example_key
# Username
USERNAME=user
# Password sha512 hash (this is "example")
PASSWORD_HASH=3bb12eda3c298db5de25597f54d924f2e17e78a26ad8953ed8218ee682f0bbbe9021e2f3009d152c911bf1f25ec683a902714166767afbd8e5bd0fb0124ecb8a

```
