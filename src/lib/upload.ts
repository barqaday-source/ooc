// ====================================================================
// upload.ts - أدوات رفع الملفات إلى Supabase Storage
// ====================================================================
// كل ملف يُرفع داخل مجلد user_id الخاص به (RLS يفرض ذلك).
// ====================================================================

import { supabase } from "./supabase";

type Bucket = "avatars" | "chat-media" | "voice-notes" | "room-covers";

export async function uploadFile(
  bucket: Bucket,
  userId: string,
  file: Blob | File,
  ext?: string,
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const safeExt =
      ext ||
      (file instanceof File
        ? file.name.split(".").pop() || "bin"
        : (file.type.split("/")[1] || "bin"));
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
    const path = `${userId}/${fileName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file instanceof File ? file.type : undefined,
      });

    if (error) return { url: null, error: new Error(error.message) };

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (e) {
    return { url: null, error: e as Error };
  }
}

export async function uploadUserAvatar(
  userId: string,
  file: Blob | File,
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const path = `${userId}/avatar.jpg`;
    await supabase.storage.from("avatars").remove([path]);
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, {
        cacheControl: "0",
        upsert: false,
        contentType: "image/jpeg",
      });

    if (error) return { url: null, error: new Error(error.message) };

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return { url: `${data.publicUrl}?v=${Date.now()}`, error: null };
  } catch (e) {
    return { url: null, error: e as Error };
  }
}

// ضغط الصور قبل الرفع لتوفير الباندويث
export async function compressImage(file: File, maxSize = 1280, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas error"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/jpeg",
        quality,
      );
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}
