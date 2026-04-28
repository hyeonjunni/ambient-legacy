# AGENTS.md

This file is a quick-operating guide for AI coding agents working in this repository.

## Project Overview

Ambient Legacy is a family digital legacy application built with:
- Expo / React Native frontend
- FastAPI backend
- Google Cloud SQL (PostgreSQL) for metadata
- Google Cloud Storage-ready media flow with local fallback

The current system supports:
- Google sign-in
- Profile onboarding after login
- Family room create / join / delete
- Family member detail view
- Room-scoped uploads
- Image / video upload and viewing
- Backend metadata sync through Cloud SQL

## Repository Layout

```text
ambient-legacy/
  README.md
  AGENTS.md
  app/
    App.js
    app.json
    package.json
    android/
  backend/
    app/
      main.py
      api/routes/
      core/
      models/
      schemas/
    requirements.txt
    .env
```

## Frontend Notes

Main frontend file:
- `app/App.js`

Important current frontend behaviors:
- `API_BASE_URL` points to the local or reachable backend server.
- Login can require a profile form before full use.
- Family room data is server-backed, not purely local state.
- Image / video records may expose `사진 보기` / `영상 보기` actions.
- Storage records are room-scoped.

If frontend behavior looks stale on device:
- Development build: reload the app / Metro
- Release APK: rebuild and reinstall

## Backend Notes

Main backend entry:
- `backend/app/main.py`

Important routes:
- `POST /api/v1/auth/google`
- `POST /api/v1/families`
- `POST /api/v1/families/join`
- `DELETE /api/v1/families/{room_id}`
- `GET /api/v1/families/{room_id}/members`
- `POST /api/v1/uploads`
- `POST /api/v1/uploads/{upload_id}/binary`
- `GET /api/v1/uploads/{upload_id}/content`
- `GET /api/v1/system/health/db`

The backend is expected to run with:
```powershell
cd C:\ambient-legacy\backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:
```text
http://<server-ip>:8000/api/v1/system/health/db
```

## Database and Storage

### Cloud SQL
The backend uses Google Cloud SQL through the Cloud SQL Python Connector.
Typical `.env` values:

```env
USE_CLOUD_SQL_CONNECTOR=true
INSTANCE_CONNECTION_NAME=<project-id>:<region>:<instance-name>
DB_USER=ambient_user
DB_PASS=<password>
DB_NAME=ambient_legacy
GCP_PROJECT_ID=<project-id>
```

### Google Cloud Storage
Media storage is GCS-ready.
If GCS upload fails or a bucket is missing, the backend may fall back to local media storage depending on current backend logic.

Typical `.env` values:
```env
GCS_BUCKET_NAME=<real-bucket-name>
USE_GCS_MEDIA_STORAGE=true
```

## Local Development Flow

### Start backend
```powershell
cd C:\ambient-legacy\backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Run app on Android device
```powershell
cd C:\ambient-legacy\app
npx expo run:android
```

### Start Metro only
```powershell
cd C:\ambient-legacy\app
npm run start
```

### Build release APK locally
```powershell
cd C:\ambient-legacy\app\android
cmd /c gradlew.bat clean
cmd /c gradlew.bat assembleRelease
```

APK output path:
```text
C:\ambient-legacy\app\android\app\build\outputs\apk\release\app-release.apk
```

## Important Operational Assumptions

- The app talks to the backend, not directly to Cloud SQL or GCS.
- For local network testing, the backend must be reachable from the phone.
- `API_BASE_URL` must match the current backend IP or deployed backend URL.
- If multiple phones are testing together, they must reach the same backend server.
- If the backend is only bound to `127.0.0.1`, phones cannot connect.
- Some app issues that look like frontend bugs are actually backend reachability problems.

## Current Known Areas of Caution

- Local IP changes can break app-to-backend communication.
- Release APKs do not hot-reload JS changes; rebuild is required.
- Google sign-in depends on correct Android package name, SHA-1, and OAuth client setup.
- GCS uploads require a real bucket name and valid project configuration.
- Cloud SQL auth failures are often caused by stale `.env` credentials.

## Recommended Next Development Steps

1. Finish moving uploaded media fully into Google Cloud Storage production flow.
2. Strengthen upload metadata structure around room ownership, uploader, type, and timestamps.
3. Improve backend query efficiency for family room list / member count sync.
4. Add stronger profile and member editing flows.
5. Move backend to a public deployment target if external-network usage is required.

## Agent Guidance

When editing this repository:
- Prefer small, targeted changes.
- Preserve working family-room flows.
- Treat `app/App.js` as high-impact; many UI flows currently converge there.
- If backend schema or route behavior changes, verify the frontend assumptions too.
- If you change media behavior, test both upload and viewing.
- If you change auth or onboarding, test logout / relogin / profile state transitions.

## Verification Checklist

Before considering a feature stable, verify:
- Login works
- Profile form works
- Family room create works
- Family room join works on another device
- Family room member list updates correctly
- Family room delete removes the room cleanly
- Image upload works
- Image view works on another device
- Video upload works
- Video view works on another device
- `GET /api/v1/system/health/db` returns connected

## Primary Files Worth Checking First

- `app/App.js`
- `backend/app/main.py`
- `backend/app/api/routes/auth.py`
- `backend/app/api/routes/families.py`
- `backend/app/api/routes/uploads.py`
- `backend/app/core/config.py`
- `backend/app/core/database.py`
- `backend/requirements.txt`
