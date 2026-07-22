// src/lib/server/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from '$env/static/private';

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key:    CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure:     true,
});

// ── Types ─────────────────────────────────────────────────────────

export interface UploadResult {
  url:        string;   // secure HTTPS delivery URL
  publicId:   string;   // Cloudinary public_id — store this for deletion
  format:     string;   // 'pdf' | 'jpg' | 'png' etc.
  bytes:      number;
  resourceType: string; // 'image' | 'raw' | 'video'
}

// ── Folder strategy ───────────────────────────────────────────────
// sabify/
//   vault/       — past questions, assignments, textbooks
//   avatars/     — user profile images
//   receipts/    — payment receipts
//   events/      — event cover images

type UploadFolder = 'vault' | 'avatars' | 'receipts' | 'events';

// ── Core upload ───────────────────────────────────────────────────

export async function uploadFile(
  file: File,
  folder: UploadFolder = 'vault',
  options: {
    publicId?: string;           // custom ID — omit to let Cloudinary generate
    tags?: string[];
    maxSizeMB?: number;          // default 20MB
  } = {}
): Promise<UploadResult> {
  const maxBytes = (options.maxSizeMB ?? 20) * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new Error(`File too large. Maximum size is ${options.maxSizeMB ?? 20}MB.`);
  }

  // Convert File → Buffer → base64 data URI
  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString('base64');
  const dataUri = `data:${file.type};base64,${base64}`;

  // Determine resource type
  // Cloudinary requires 'raw' for PDFs and non-image files
  const resourceType = file.type.startsWith('image/') ? 'image' : 'raw';

  const result = await cloudinary.uploader.upload(dataUri, {
    folder:        `sabify/${folder}`,
    public_id:     options.publicId,
    resource_type: resourceType,
    tags:          options.tags ?? [],
    // Auto-generate a delivery URL that works for both images and PDFs
    // For PDFs: Cloudinary can serve them directly or generate previews
    ...(resourceType === 'image' && {
      quality:     'auto',
      fetch_format:'auto',
    }),
  });

  return {
    url:          result.secure_url,
    publicId:     result.public_id,
    format:       result.format,
    bytes:        result.bytes,
    resourceType: result.resource_type,
  };
}

// ── Delete ────────────────────────────────────────────────────────

export async function deleteFile(
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'raw'
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

// ── Get PDF thumbnail URL ─────────────────────────────────────────
// Cloudinary can generate a JPG preview of page 1 of any uploaded PDF.
// Use this to show a thumbnail in the library UI.

export function getPdfThumbnailUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    resource_type: 'image',   // tell Cloudinary to treat as image for transformation
    format:        'jpg',
    page:          1,
    width:         400,
    crop:          'scale',
    quality:       'auto',
    secure:        true,
  });
}

// ── Signed upload URL (for direct browser → Cloudinary uploads) ───
// Use this when you want to upload directly from the browser
// without routing the file through your server.

export function getSignedUploadParams(
  folder: UploadFolder,
  tags: string[] = []
): { signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string } {
  const timestamp = Math.round(Date.now() / 1000);
  const folderPath = `sabify/${folder}`;

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: folderPath, tags: tags.join(',') },
    CLOUDINARY_API_SECRET
  );

  return {
    signature,
    timestamp,
    apiKey:    CLOUDINARY_API_KEY,
    cloudName: CLOUDINARY_CLOUD_NAME,
    folder:    folderPath,
  };
}