/**
 * Firebase Admin SDK — use apenas em Node (scripts, API, não no bundle Vite).
 * Defina GOOGLE_APPLICATION_CREDENTIALS com o caminho absoluto do JSON da service account.
 */
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

/** Opcional: passe FIREBASE_STORAGE_BUCKET se o default não for emerson-1e6d2.appspot.com */
export function adminBucket(bucket?: string) {
  return getAdminApp().storage().bucket(bucket ?? process.env.FIREBASE_STORAGE_BUCKET);
}
