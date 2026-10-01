FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libssl-dev \
    libffi-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY services/worker/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ecdat/ /app/ecdat/
COPY services/ /app/services/
COPY config/ /app/config/
COPY scripts/ /app/scripts/

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["rq", "worker", "--with-scheduler", "--url", "${REDIS_URL:-redis://redis:6379/0}", "ecdat"]
