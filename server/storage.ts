// Storage via Cloudinary (gratuito fino a 25GB)
// Alternativa: rimuovere il salvataggio foto e usare solo base64 in memoria

import { v2 as cloudinary } from "cloudinary";
import { ENV } from "./_core/env";

let _configured = false;

function ensureConfigured() {
  if (_configured) return;
  if (!ENV.cloudinaryCloudName || !ENV.cloudinaryApiKey || !ENV.cloudinaryApiSecret) {
    // Se Cloudinary non è configurato, le foto non vengono salvate permanentemente
    // ma l'analisi AI funziona comunque tramite base64
    console.warn("[Storage] Cloudinary non configurato: le foto non verranno salvate permanentemente.");
    return;
  }
  cloudinary.config({
    cloud_name: ENV.cloudinaryCloudName,
    api_key: ENV.cloudinaryApiKey,
    api_secret: ENV.cloudinaryApiSecret,
  });
  _configured = true;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  ensureConfigured();

  if (!ENV.cloudinaryCloudName) {
    // Fallback: restituisce una chiave fittizia, la foto non viene salvata
    const key = relKey.replace(/^\/+/, "");
    return { key, url: "" };
  }

  // Converti in base64 data URL per Cloudinary
  const base64 = Buffer.isBuffer(data)
    ? data.toString("base64")
    : Buffer.from(data as Uint8Array).toString("base64");

  const dataUrl = `data:${contentType};base64,${base64}`;
  const publicId = relKey.replace(/^\/+/, "").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_/-]/g, "_");

  const result = await cloudinary.uploader.upload(dataUrl, {
    public_id: publicId,
    resource_type: "auto",
    overwrite: false,
  });

  return { key: result.public_id, url: result.secure_url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  ensureConfigured();
  if (!ENV.cloudinaryCloudName) {
    return { key: relKey, url: "" };
  }
  const url = cloudinary.url(relKey, { secure: true });
  return { key: relKey, url };
}
