"use client";

import { createClient } from "@/lib/supabase/client";

type SignResponse = {
  signature: string;
  timestamp: number;
  apiKey: string;
  folder: string;
  cloudName: string;
};

type UploadResponse = { secure_url: string };

export type CloudinaryUploadPurpose = "avatar" | "logo" | "upload" | "card";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

async function signCloudinaryUpload(options: {
  orgId: string;
  purpose?: CloudinaryUploadPurpose;
  cardId?: string;
}): Promise<SignResponse> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cloudinary-sign`;
  const sigRes = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
    body: JSON.stringify({
      orgId: options.orgId,
      purpose: options.purpose ?? "upload",
      cardId: options.cardId,
    }),
  });
  if (!sigRes.ok) throw new Error("Falha ao assinar o upload.");
  return (await sigRes.json()) as SignResponse;
}

async function postCloudinaryUpload(
  file: File,
  sig: SignResponse,
  resourceType: "image" | "auto",
): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Arquivo maior que 10 MB.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const upRes = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`,
    { method: "POST", body: form },
  );
  if (!upRes.ok) throw new Error("Falha no upload do arquivo.");
  const data = (await upRes.json()) as UploadResponse;
  return data.secure_url;
}

export async function uploadImageToCloudinary(
  file: File,
  options: {
    orgId: string;
    purpose?: CloudinaryUploadPurpose;
    cardId?: string;
  },
): Promise<string> {
  const sig = await signCloudinaryUpload(options);
  return postCloudinaryUpload(file, sig, "image");
}

export async function uploadFileToCloudinary(
  file: File,
  options: {
    orgId: string;
    purpose?: CloudinaryUploadPurpose;
    cardId?: string;
  },
): Promise<string> {
  const sig = await signCloudinaryUpload(options);
  const resourceType = file.type.startsWith("image/") ? "image" : "auto";
  return postCloudinaryUpload(file, sig, resourceType);
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
}
