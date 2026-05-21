# ---- Frontend (Vite + React + Tailwind)
FROM node:22-bookworm-slim AS web-build
RUN groupadd -r appuser && useradd -r -g appuser appuser
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
# Invalida esta capa en cada deploy aunque el cache diga «sin cambios» (véase BUILD_REF).
# SITE_DOMAIN: hostname público (p. ej. gastodehoy.kyadigital.es) → canonical/OG absolutos en dist/.
ARG BUILD_REF
ARG SITE_DOMAIN
ENV SITE_DOMAIN=${SITE_DOMAIN}
RUN printf "WEB_BUILD_REF=%s\\n" "${BUILD_REF:-unknown}" \
    && npm run build

# ---- API
FROM python:3.13-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY --from=web-build /web/dist ./web/dist

RUN mkdir -p /app/data && chown -R appuser:appuser /app/data

EXPOSE 8000

USER appuser

# En runtime: define APP_SECRET (≥32 chars), ENV=production, COOKIE_SECURE=true,
# CORS_ORIGINS, y TRUST_FORWARDED_FOR=true si hay reverse proxy.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
