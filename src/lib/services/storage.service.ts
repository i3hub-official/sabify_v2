// src/lib/services/storage.service.ts
// File storage for VaultDocument uploads, incident media, event images, etc.
//
// Provider assumption: Cloudinary — the schema itself commits to this via
// `VaultDocument.cloudinaryPublicId` / `cloudinaryType`, so this isn't a
// generic swappable backend the way SMS/payment are. If you need multi-
// provider support later, those two Prisma columns need to become
// provider-agnostic (e.g. `storageProvider` + `storageKey`) first.

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET
const CLOUDINARY_UPLOAD_URL = CLOUDINARY_CLOUD_NAME
  ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}`
  : null

export interface UploadResult {
  url: string
  publicId: string
  resourceType: string // "image" | "raw" | "video" | "auto"
  bytes: number
  format?: string
}

function assertConfigured(): void {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      'Storage service is not configured (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET missing)',
    )
  }
}

// Cloudinary's unsigned REST upload needs a signature over every param
// except file/api_key/resource_type. Doing this by hand (rather than the
// cloudinary SDK) so this file has no hard dependency on that package —
// swap this out if the project already has `cloudinary` installed.
async function signParams(params: Record<string, string | number>): Promise<string> {
  const { createHash } = await import('crypto')
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return createHash('sha1').update(`${toSign}${CLOUDINARY_API_SECRET}`).digest('hex')
}

/**
 * Upload a file (as base64 data URI or a remote URL Cloudinary can fetch)
 * to Cloudinary. `folder` should namespace by course/document category,
 * e.g. `vault/${courseId}/${category}`.
 */
export async function uploadFile(
  fileData: string,
  options: { folder: string; resourceType?: 'image' | 'raw' | 'video' | 'auto'; publicId?: string } = {
    folder: 'uploads',
  },
): Promise<UploadResult> {
  assertConfigured()

  const timestamp = Math.floor(Date.now() / 1000)
  const resourceType = options.resourceType || 'auto'

  const signParamsObj: Record<string, string | number> = {
    timestamp,
    folder: options.folder,
    ...(options.publicId ? { public_id: options.publicId } : {}),
  }
  const signature = await signParams(signParamsObj)

  const body = new URLSearchParams({
    file: fileData,
    api_key: CLOUDINARY_API_KEY as string,
    timestamp: String(timestamp),
    folder: options.folder,
    signature,
    ...(options.publicId ? { public_id: options.publicId } : {}),
  })

  const res = await fetch(`${CLOUDINARY_UPLOAD_URL}/${resourceType}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(`Cloudinary upload failed: ${data?.error?.message || res.status}`)
  }

  return {
    url: data.secure_url,
    publicId: data.public_id,
    resourceType: data.resource_type,
    bytes: data.bytes,
    format: data.format,
  }
}

/**
 * Delete a file from Cloudinary by its public ID.
 */
export async function deleteFile(publicId: string, resourceType: 'image' | 'raw' | 'video' = 'image'): Promise<boolean> {
  assertConfigured()

  try {
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = await signParams({ public_id: publicId, timestamp })

    const body = new URLSearchParams({
      public_id: publicId,
      api_key: CLOUDINARY_API_KEY as string,
      timestamp: String(timestamp),
      signature,
    })

    const res = await fetch(`${CLOUDINARY_UPLOAD_URL}/${resourceType}/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    const data = await res.json()
    return res.ok && data?.result === 'ok'
  } catch (error) {
    console.error('[storage.service] deleteFile failed:', error)
    return false
  }
}

/**
 * Build a delivery URL for an existing Cloudinary asset (no network call —
 * pure URL construction, useful for on-the-fly transforms like thumbnails).
 */
export function getFileUrl(
  publicId: string,
  options: { resourceType?: 'image' | 'raw' | 'video'; transform?: string } = {},
): string {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Storage service is not configured (CLOUDINARY_CLOUD_NAME missing)')
  }
  const resourceType = options.resourceType || 'image'
  const transformSegment = options.transform ? `${options.transform}/` : ''
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload/${transformSegment}${publicId}`
}