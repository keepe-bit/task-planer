import hashlib
import hmac
import secrets
from backend.config import HASH_ITERATIONS, SALT_BYTES, SESSION_TOKEN_BYTES


def hash_password(password: str) -> str:
    if not password or not isinstance(password, str):
        raise ValueError("Password must be a non-empty string")
    salt = secrets.token_bytes(SALT_BYTES)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, HASH_ITERATIONS)
    return f"pbkdf2_sha256${HASH_ITERATIONS}${salt.hex()}${derived.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    if not password or not stored_hash:
        return False
    try:
        parts = stored_hash.split("$")
        if len(parts) != 4:
            return False
        algo, iterations_str, salt_hex, key_hex = parts
        if algo != "pbkdf2_sha256":
            return False
        iterations = int(iterations_str)
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        candidate_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(candidate_key, expected_key)
    except Exception:
        return False


def generate_session_token() -> str:
    return secrets.token_hex(SESSION_TOKEN_BYTES)
