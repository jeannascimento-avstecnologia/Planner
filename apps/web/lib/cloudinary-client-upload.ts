"use client";

type UploadResponse = { secure_url: string };

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function uploadFileToCloudinary(file: File, cardId: string): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Arquivo maior que 10 MB.");
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "agify_unsigned";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);
  formData.append("folder", `card-attachments/${cardId}`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const data = (await res.json()) as UploadResponse;
  return data.secure_url;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
}
