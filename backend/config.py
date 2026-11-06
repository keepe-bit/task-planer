import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DB_PATH = os.environ.get("TASK_PLANNER_DB_PATH", str(DATA_DIR / "planner.db"))

HASH_ITERATIONS = 600_000
SALT_BYTES = 32
SESSION_TOKEN_BYTES = 32
SESSION_TTL_HOURS = 24

SERVER_HOST = os.environ.get("SERVER_HOST", "127.0.0.1")
SERVER_PORT = int(os.environ.get("SERVER_PORT", "5050"))
