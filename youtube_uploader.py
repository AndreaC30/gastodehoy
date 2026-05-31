#!/usr/bin/env python3
"""
YouTube Uploader para GastoDeHoy
Autenticación OAuth 2.0 + subida de vídeos a YouTube.
Uso:
  python3 youtube_uploader.py auth                (genera URL de auth)
  python3 youtube_uploader.py auth CODIGO         (completa auth con código)
  python3 youtube_uploader.py upload video.mp4     (subir vídeo)
"""

import os
import sys
import json
import pickle
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

BASE_DIR = Path(__file__).parent
CLIENT_SECRETS = Path("/root/.secrets/youtube-gastodehoy.json")
TOKEN_FILE = BASE_DIR / "youtube_token.pickle"
STATE_FILE = BASE_DIR / ".youtube_auth_state"

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]


def get_authenticated_service():
    creds = None
    if TOKEN_FILE.exists():
        with open(TOKEN_FILE, "rb") as f:
            creds = pickle.load(f)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            print(json.dumps({"error": "No autenticado. Ejecuta primero: python3 youtube_uploader.py auth"}))
            sys.exit(1)
        with open(TOKEN_FILE, "wb") as f:
            pickle.dump(creds, f)

    return build("youtube", "v3", credentials=creds)


def upload_video(
    file_path,
    title="Nuevo vídeo de GastoDeHoy",
    description="",
    tags=None,
    category_id="22",
    privacy="unlisted",
):
    if not os.path.exists(file_path):
        print(json.dumps({"error": f"No existe: {file_path}"}))
        sys.exit(1)

    youtube = get_authenticated_service()

    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags or ["gastodehoy", "finanzas", "ahorro"],
            "categoryId": category_id,
        },
        "status": {
            "privacyStatus": privacy,
            "selfDeclaredMadeForKids": False,
        },
    }

    media = MediaFileUpload(file_path, chunksize=-1, resumable=True)
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    print(json.dumps({"status": "uploading", "file": file_path}))

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            pct = int(status.progress() * 100)
            print(json.dumps({"status": "progress", "percent": pct}))

    video_id = response["id"]
    print(json.dumps({
        "status": "done",
        "video_id": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "title": title,
    }))
    return response


# ---- Auth flow ----

def _make_flow():
    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRETS), SCOPES)
    flow.redirect_uri = "http://localhost"
    return flow


def auth_step1():
    """Genera URL de autorización. Guarda code_verifier para paso 2."""
    flow = _make_flow()
    auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")

    # Guardar code_verifier (PKCE) — necesario para intercambiar el código luego
    with open(STATE_FILE, "w") as f:
        json.dump({"code_verifier": flow.code_verifier}, f)

    print(auth_url)


def auth_step2(code):
    """Intercambia código de autorización por tokens."""
    flow = _make_flow()

    # Restaurar code_verifier guardado en paso 1
    if not STATE_FILE.exists():
        print(json.dumps({"error": "Ejecuta primero 'auth' sin código para generar la URL"}))
        sys.exit(1)

    with open(STATE_FILE) as f:
        state_data = json.load(f)

    # Inyectar el code_verifier original en el flow
    # (necesario porque el constructor genera uno nuevo)
    flow.code_verifier = state_data["code_verifier"]

    flow.fetch_token(code=code)
    creds = flow.credentials

    with open(TOKEN_FILE, "wb") as f:
        pickle.dump(creds, f)

    STATE_FILE.unlink()
    print(json.dumps({"status": "ok", "message": "Autenticado correctamente. Token guardado."}))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 youtube_uploader.py auth [CODIGO] | upload <video> [título]")
        sys.exit(1)

    action = sys.argv[1]

    if action == "auth":
        if len(sys.argv) >= 3:
            auth_step2(sys.argv[2])
        else:
            auth_step1()

    elif action == "upload":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Falta el archivo de vídeo"}))
            sys.exit(1)
        upload_video(sys.argv[2],
                     title=sys.argv[3] if len(sys.argv) > 3 else "Nuevo vídeo de GastoDeHoy",
                     description=sys.argv[4] if len(sys.argv) > 4 else "")

    else:
        print(f"Acción desconocida: {action}")
        sys.exit(1)
