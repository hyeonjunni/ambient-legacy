# Ambient Legacy

Ambient Legacy is a family-focused digital archive project built with a mobile app and a local/cloud-backed API server.

This repository currently contains two main parts:

- `app/`: Expo / React Native Android app
- `backend/`: FastAPI backend connected to Google Cloud SQL (PostgreSQL) and prepared for Google Cloud Storage media uploads

## Current Working Features

The following flows are implemented and tested at a prototype level:

- Google sign-in based app entry
- Post-login personal profile form
- Family room creation
- Family room join by invite code
- Family member list and member detail modal
- Family room deletion
- Room-scoped upload metadata storage
- Image upload and image viewing
- Video upload and video viewing
- Cloud SQL storage for users, family rooms, memberships, and upload metadata
- Google Cloud Storage-ready media upload flow with local fallback

## Tech Stack

### App
- Expo 54
- React Native 0.81
- Google Sign-In
- AsyncStorage
- Expo Image Picker
- Expo Video

### Backend
- FastAPI
- SQLAlchemy
- PostgreSQL (Google Cloud SQL)
- Google Cloud Storage
- Cloud SQL Python Connector

## Repository Structure

```text
ambient-legacy/
  app/
    App.js
    app.json
    package.json
    android/
  backend/
    app/
      api/
      core/
      models/
      schemas/
      storage/
    docs/
    requirements.txt
    .env
```

## Running the Backend

```powershell
cd C:\ambient-legacy\backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```text
http://<YOUR-PC-IP>:8000/api/v1/system/health/db
```

Expected response:

```json
{"database":"connected"}
```

## Running the App

### Install development build on Android

```powershell
cd C:\ambient-legacy\app
npx expo run:android
```

### Start Expo dev server

```powershell
cd C:\ambient-legacy\app
npm run start
```

## Android Release APK Build

```powershell
cd C:\ambient-legacy\app\android
cmd /c gradlew.bat clean
cmd /c gradlew.bat assembleRelease
```

Generated APK path:

```text
app/android/app/build/outputs/apk/release/app-release.apk
```

## Example Backend Environment Variables

File: `backend/.env`

```env
APP_NAME=Ambient Legacy Backend
API_PREFIX=/api/v1

USE_CLOUD_SQL_CONNECTOR=true
INSTANCE_CONNECTION_NAME=<project-id>:asia-northeast3:<instance-name>
DB_USER=ambient_user
DB_PASS=<db-password>
DB_NAME=ambient_legacy
PRIVATE_IP=false

GCP_PROJECT_ID=<gcp-project-id>
GCS_BUCKET_NAME=<gcs-bucket-name>
USE_GCS_MEDIA_STORAGE=true
```

## Upload Storage Flow

Current upload flow:

1. The app creates an upload entry for the active family room.
2. The backend stores upload metadata in Cloud SQL.
3. The backend tries to upload the actual file to Google Cloud Storage.
4. If GCS upload is unavailable or misconfigured, the backend falls back to local storage.
5. The app views media through backend-controlled URLs rather than opening the storage layer directly.

This structure keeps the app simple and allows backend-side permission checks.

## Notes

- `API_BASE_URL` in `app/App.js` must point to the currently running backend server.
- For local Wi-Fi testing, do not use `127.0.0.1`; use the PC's local IPv4 address.
- Google Sign-In must be tested with a development build or native build, not plain Expo Go.
- If the configured GCS bucket does not exist, uploads will fall back to local media storage.

## Next Steps

- Move upload media storage fully to Google Cloud Storage
- Expand room-scoped upload structure for text, audio, image, and video records
- Add metadata extraction pipelines (STT, OCR, tagging)
- Extend toward Whisper / OCR / EXAONE / RAG integration
- Deploy backend for use outside the local network

## Key Files

- App main logic: `app/App.js`
- Upload API: `backend/app/api/routes/uploads.py`
- Backend config: `backend/app/core/config.py`
- Backend DB connection: `backend/app/core/database.py`
