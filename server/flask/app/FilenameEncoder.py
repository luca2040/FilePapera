import base64


class FilenameEncoder:
    def __init__(self, base_filepath: str):
        """The base filepath wont be replaced as it is the "uploads" dir"""

        self.encode_map = {
            '/': '_',
            '+': '-',
            '=': '.',
        }
        self.decode_map = {replacement: original for
                           original, replacement in
                           self.encode_map.items()}

        self.basepath = base_filepath

    def encode_str(self, text: str) -> str:
        """Encode a string to base64 but replace not valid characters"""

        base64_bytes = base64.urlsafe_b64encode(
            text.encode('utf-8')).decode('utf-8')

        for original, replacement in self.encode_map.items():
            base64_bytes = base64_bytes.replace(original, replacement)

        return base64_bytes

    def decode_str(self, encoded_text: str) -> str:
        """Decodes things encoded using this class"""

        for replacement, original in self.decode_map.items():
            encoded_text = encoded_text.replace(replacement, original)

        decoded_bytes = base64.urlsafe_b64decode(encoded_text.encode('utf-8'))

        return decoded_bytes.decode('utf-8')

    def encode(self, path: str) -> str:
        "Encodes the path keeping the basepath"

        path_parts = path.split("/")
        encoded_parts = [
            self.encode_str(part) if part != self.basepath
            else self.basepath
            for part in path_parts]

        return "/".join(encoded_parts)

    def decode(self, enc_path: str) -> str:
        "Decodes it"

        enc_path_parts = enc_path.split("/")
        decoded_parts = [
            self.decode_str(part) if part != self.basepath
            else self.basepath
            for part in enc_path_parts]

        return "/".join(decoded_parts)
