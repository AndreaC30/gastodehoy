# Imagen oficial: https://hub.docker.com/_/python — actualiza la minor con `docker compose build --pull`
# 3.13 = familia actual estable; 3.14+ cuando tus wheels (psycopg2, etc.) lo permitan
FROM python:3.13-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# tzdata: ZoneInfo("Europe/Madrid") requiere base de datos IANA (en slim no viene completa)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY static ./static

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
