/**
 * Firebase Admin SDK — use apenas em Node (scripts, API, não no bundle Vite).
 * Carrega `.env` na raiz do projeto (GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_STORAGE_BUCKET).
 */
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import admin from "firebase-admin";

function loadCredentialPath(): string {
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (fromEnv) {
    const p = resolve(fromEnv);
    if (!existsSync(p)) {
      throw new Error(`GOOGLE_APPLICATION_CREDENTIALS não encontrado: ${p}`);
    }
    return p;
  }
  throw new Error(
    "Defina GOOGLE_APPLICATION_CREDENTIALS com o caminho do JSON da service account."
  );
}

export function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }
  const path = loadCredentialPath();
  const serviceAccount = JSON.parse(readFileSync(path, "utf8"));
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export function adminDb() {
  return getAdminApp().firestore();
}

export function adminAuth() {
  return getAdminApp().auth();
}

/** Usa FIREBASE_STORAGE_BUCKET do `.env` ou o bucket default do projeto. */
export function adminBucket(bucket?: string) {
  const name = bucket ?? process.env.FIREBASE_STORAGE_BUCKET;
  return name
    ? getAdminApp().storage().bucket(name)
    : getAdminApp().storage().bucket();
}
