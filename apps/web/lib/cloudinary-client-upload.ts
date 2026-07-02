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

export async function uploadImageToCloudinary(
  file: File,
  options: { folder?: string; orgId?: string },
): Promise<string> {
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
    body: JSON.stringify({ folder: options.folder, orgId: options.orgId }),
  });
  if (!sigRes.ok) throw new Error("Falha ao assinar o upload.");
  const sig = (await sigRes.json()) as SignResponse;

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const upRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!upRes.ok) throw new Error("Falha no upload da imagem.");
  const data = (await upRes.json()) as UploadResponse;
  return data.secure_url;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
}
