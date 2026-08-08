import os
from pathlib import Path

from app.utils.FilenameEncoder import FilenameEncoder
from app.utils.Translations import Translations


def _app_dir() -> str:
    env_dir = os.environ.get("APP_DIR")
    if env_dir:
        return env_dir
    return str(Path(__file__).resolve().parents[2] / "server" / "flask")


# ---------------------------------------------------------------------------
# FilenameEncoder
# ---------------------------------------------------------------------------


def _encoder(tmp_path):
    return FilenameEncoder(str(tmp_path))


def test_encode_decode_roundtrip(tmp_path):
    enc = _encoder(tmp_path)
    path = str(tmp_path / "folder" / "my file (1).txt")

    encoded = enc.encode(path)
    assert encoded.startswith(str(tmp_path) + "/")
    assert enc.decode(encoded) == path


def test_encode_keeps_basepath(tmp_path):
    enc = _encoder(tmp_path)
    assert enc.encode(str(tmp_path)) == str(tmp_path)


def test_encode_unicode_filenames(tmp_path):
    enc = _encoder(tmp_path)
    path = str(tmp_path / "café-ñ.txt")
    assert enc.decode(enc.encode(path)) == path


def test_encode_special_characters(tmp_path):
    enc = _encoder(tmp_path)
    path = str(tmp_path / "a+b=c d/e")
    assert enc.decode(enc.encode(path)) == path


def test_encode_windows_separators(tmp_path):
    enc = _encoder(tmp_path)
    windows_path = str(tmp_path).replace("/", "\\") + "\\sub\\file.txt"
    expected = str(tmp_path / "sub" / "file.txt")
    assert enc.decode(enc.encode(windows_path)) == expected


def test_encoded_names_are_safe_for_filenames(tmp_path):
    enc = _encoder(tmp_path)
    path = str(tmp_path / "weird/name with spaces+.txt")
    encoded = enc.encode(path)
    encoded_name = encoded.rsplit("/", 1)[-1]
    assert "/" not in encoded_name
    assert ".." not in encoded_name


# ---------------------------------------------------------------------------
# Translations
# ---------------------------------------------------------------------------


def test_loads_en_and_it():
    lang_dir = os.path.join(_app_dir(), "app", "lang")
    translations = Translations(lang_dir, "en")
    translations.load()

    assert set(translations.available_langs()) == {"en", "it"}


def test_get_falls_back_to_default_lang(tmp_path):
    lang_dir = os.path.join(_app_dir(), "app", "lang")
    translations = Translations(lang_dir, "en")
    translations.load()

    en = translations.get("en")
    assert translations.get("nonexistent-lang") == en


def test_loaded_translations_are_complete(tmp_path):
    lang_dir = os.path.join(_app_dir(), "app", "lang")
    translations = Translations(lang_dir, "en")
    translations.load()

    en = translations.get("en")
    it = translations.get("it")

    assert set(en.keys()) == set(it.keys())
    assert en["title_html"]
