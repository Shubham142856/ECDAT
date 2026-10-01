"""
ECDAT Worker — Process entry point for RQ.

Supports Windows (using SimpleWorker to avoid os.fork()) and Linux/Docker (using Worker).
Runs jobs from the 'ecdat' queue.
"""
from __future__ import annotations

import logging
import os
import platform
import sys
from pathlib import Path

# Add src root to sys.path so modules import reliably
SRC_ROOT = Path(__file__).resolve().parent.parent.parent
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

# Optional simple .env loader if .env exists
env_path = SRC_ROOT / ".env"
if env_path.exists():
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if key and key not in os.environ:
                        os.environ[key] = val
    except Exception:
        pass

from redis import Redis
from rq import Queue, SimpleWorker, Worker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ecdat.worker")


def main():
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    queue_name = os.environ.get("ECDAT_QUEUE", "ecdat")

    logger.info(f"Connecting to Redis at {redis_url}...")
    try:
        conn = Redis.from_url(redis_url)
        conn.ping()
        logger.info("Connected to Redis successfully.")
    except Exception as exc:
        logger.error(f"Failed to connect to Redis at {redis_url}: {exc}")
        sys.exit(1)

    queue = Queue(queue_name, connection=conn)

    # SimpleWorker is required on Windows as os.fork() is not supported
    if platform.system() == "Windows":
        logger.info(f"OS is Windows: Initializing SimpleWorker on queue '{queue_name}'...")
        worker = SimpleWorker([queue], connection=conn)
    else:
        logger.info(f"OS is {platform.system()}: Initializing Worker on queue '{queue_name}'...")
        worker = Worker([queue], connection=conn)

    logger.info(f"Worker ready! Listening for jobs on queue '{queue_name}'...")
    worker.work(with_scheduler=True)


if __name__ == "__main__":
    main()
