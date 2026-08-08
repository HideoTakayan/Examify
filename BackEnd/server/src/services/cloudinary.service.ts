import { v2 as cloudinary } from "cloudinary";
import { env } from "~/config/enviroment";

type ResourceType = "image" | "video" | "raw";
export const EXAM_MEDIA_FOLDER = "exam-media";
export const EXAM_PREVIEW_MEDIA_FOLDER = "exam-media-preview";

let configured = false;

function ensureCloudinaryConfig(): void {
  if (configured) return;
  if (!env.CLOUDINARY_URL) {
    throw new Error("CLOUDINARY_URL is not configured.");
  }

  const url = new URL(env.CLOUDINARY_URL);
  const cloudName = url.hostname;
  const apiKey = url.username;
  const apiSecret = url.password;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("CLOUDINARY_URL is invalid.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  configured = true;
}

function resolveResourceType(mimeType: string): ResourceType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/") || mimeType.startsWith("video/")) return "video";
  return "raw";
}

export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  resource_type: ResourceType;
  bytes: number;
  format?: string;
}

export interface CloudinaryListedResource {
  public_id: string;
  resource_type: ResourceType;
  url: string;
  secure_url: string;
  created_at: string;
  bytes: number;
  format?: string;
}

export async function uploadMediaBuffer(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folder?: string;
  tags?: string[];
}): Promise<CloudinaryUploadResult> {
  ensureCloudinaryConfig();
  const resourceType = resolveResourceType(params.mimeType);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: params.folder ?? "exams",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        tags: params.tags ?? [],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }

        resolve({
          url: result.url,
          secure_url: result.secure_url,
          public_id: result.public_id,
          resource_type: resourceType,
          bytes: result.bytes ?? 0,
          format: result.format,
        });
      }
    );

    stream.end(params.buffer);
  });
}

export async function listResourcesByFolder(
  folder: string,
  maxResults = 500
): Promise<CloudinaryListedResource[]> {
  ensureCloudinaryConfig();
  const allResources: CloudinaryListedResource[] = [];
  const resourceTypes: ResourceType[] = ["image", "video", "raw"];

  for (const resourceType of resourceTypes) {
    let nextCursor: string | undefined;
    do {
      const response = await cloudinary.api.resources({
        type: "upload",
        resource_type: resourceType,
        prefix: `${folder}/`,
        max_results: maxResults,
        next_cursor: nextCursor,
      });
      const resources = Array.isArray(response.resources) ? response.resources : [];
      for (const resource of resources) {
        allResources.push({
          public_id: resource.public_id,
          resource_type: resourceType,
          url: resource.url,
          secure_url: resource.secure_url,
          created_at: resource.created_at,
          bytes: resource.bytes ?? 0,
          format: resource.format,
        });
      }
      nextCursor = response.next_cursor ?? undefined;
    } while (nextCursor);
  }

  return allResources;
}

export async function deleteCloudinaryResource(
  publicId: string,
  resourceType: ResourceType
): Promise<void> {
  ensureCloudinaryConfig();
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}
