# Cloud Run Deployment Guide

This guide deploys the current FastAPI backend to Google Cloud Run as a development server.

## 1. Project values used in this repo

- Project ID: `project-8811dbfb-8eda-4fdb-8ff`
- Region: `asia-northeast3`
- Cloud SQL instance: `project-8811dbfb-8eda-4fdb-8ff:asia-northeast3:ambient-legacy-seoul`
- Cloud SQL DB user: `ambient_user`
- Cloud SQL DB name: `ambient_legacy`
- GCS bucket: `ambient-legacy-hanshin-team01`
- Suggested Cloud Run service name: `ambient-legacy-backend`

## 2. Required Google Cloud APIs

Enable these APIs if they are not already enabled:

- Cloud Run Admin API
- Cloud Build API
- Artifact Registry API
- Cloud SQL Admin API

## 3. Create a Cloud Run service account

You can reuse an existing service account, but a dedicated one is cleaner.

```powershell
gcloud iam service-accounts create ambient-legacy-run `
  --display-name "Ambient Legacy Cloud Run"
```

Grant the minimum roles:

```powershell
gcloud projects add-iam-policy-binding project-8811dbfb-8eda-4fdb-8ff `
  --member="serviceAccount:ambient-legacy-run@project-8811dbfb-8eda-4fdb-8ff.iam.gserviceaccount.com" `
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding project-8811dbfb-8eda-4fdb-8ff `
  --member="serviceAccount:ambient-legacy-run@project-8811dbfb-8eda-4fdb-8ff.iam.gserviceaccount.com" `
  --role="roles/storage.objectUser"
```

## 4. Build the backend image

Run this from the `backend` directory:

```powershell
cd C:\ambient-legacy\backend
gcloud builds submit --tag gcr.io/project-8811dbfb-8eda-4fdb-8ff/ambient-legacy-backend
```

## 5. Deploy to Cloud Run

Replace `YOUR_DB_PASSWORD` and `YOUR_JWT_SECRET` before running.

```powershell
gcloud run deploy ambient-legacy-backend `
  --image gcr.io/project-8811dbfb-8eda-4fdb-8ff/ambient-legacy-backend `
  --platform managed `
  --region asia-northeast3 `
  --allow-unauthenticated `
  --service-account ambient-legacy-run@project-8811dbfb-8eda-4fdb-8ff.iam.gserviceaccount.com `
  --add-cloudsql-instances project-8811dbfb-8eda-4fdb-8ff:asia-northeast3:ambient-legacy-seoul `
  --set-env-vars APP_NAME="Ambient Legacy Backend",API_PREFIX=/api/v1,USE_CLOUD_SQL_CONNECTOR=true,INSTANCE_CONNECTION_NAME=project-8811dbfb-8eda-4fdb-8ff:asia-northeast3:ambient-legacy-seoul,DB_USER=ambient_user,DB_PASS=YOUR_DB_PASSWORD,DB_NAME=ambient_legacy,PRIVATE_IP=false,GCS_BUCKET_NAME=ambient-legacy-hanshin-team01,GCP_PROJECT_ID=project-8811dbfb-8eda-4fdb-8ff,USE_GCS_MEDIA_STORAGE=true,JWT_SECRET_KEY=YOUR_JWT_SECRET
```

## 6. Verify

After deployment, Cloud Run prints a service URL like:

```text
https://ambient-legacy-backend-xxxxx.a.run.app
```

Check:

- `https://ambient-legacy-backend-xxxxx.a.run.app/`
- `https://ambient-legacy-backend-xxxxx.a.run.app/docs`

Then use this as the app backend base URL:

```text
https://ambient-legacy-backend-xxxxx.a.run.app/api/v1
```

## 7. Notes

- Do not commit real DB passwords or JWT secrets into Git.
- The local `.env` file should stay local only.
- Cloud Run should use GCS for media storage, not the local `storage/` folder.
