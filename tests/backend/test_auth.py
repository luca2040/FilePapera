def test_login_page_get(client):
    response = client.get("/login")
    assert response.status_code == 200


def test_index_redirects_when_not_logged_in(client):
    response = client.get("/index")
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/login")


def test_api_requires_login(client):
    response = client.get("/list")
    assert response.status_code == 401


def test_login_success(client):
    response = client.post(
        "/login", data={"username": "admin", "password": "password"}
    )
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/index")

    with client.session_transaction() as sess:
        assert sess["logged_in"] is True


def test_login_wrong_credentials(client):
    response = client.post(
        "/login", data={"username": "admin", "password": "wrong"}
    )
    assert response.status_code == 200

    with client.session_transaction() as sess:
        assert not sess.get("logged_in")


def test_logout(auth_client):
    response = auth_client.get("/logout")
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/login")

    with auth_client.session_transaction() as sess:
        assert not sess.get("logged_in")
