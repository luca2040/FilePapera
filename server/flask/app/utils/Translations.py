import os
import json


class Translations:
    def __init__(self, translations_path: str, default_lang: str):
        """The path is the dir where the json files of the translations are"""
        self.path = translations_path
        self.default = default_lang
        self.translations = {}

    def load(self):
        """Load into memory all the translations from the path"""
        for filename in os.listdir(self.path):
            if filename.endswith(".json"):
                lang = filename.split(".")[0]
                complete_path = os.path.join(self.path, filename)

                with open(complete_path, "r", encoding="utf-8") as file:
                    self.translations[lang] = json.load(file)

    def available_langs(self):
        """Returns a list of available langs"""
        return list(self.translations.keys())

    def get(self, lang: str):
        """Returns the specified lang dict"""
        lang_to_get = lang if lang in self.translations else self.default

        return self.translations[lang_to_get]
