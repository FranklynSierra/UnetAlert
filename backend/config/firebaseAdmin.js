import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
let serviceAccount;

if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
  // Producción: viene de una variable de entorno
  serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
} else {
  // Local: fallback al archivo (si aún lo tienes en disco)
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  serviceAccount = JSON.parse(
    fs.readFileSync(path.join(__dirname, "firebase-adminsdk.json"), "utf8")
  );
}

initializeApp({
  credential: cert(serviceAccount),
});

export const auth = getAuth();
export const db = getFirestore();