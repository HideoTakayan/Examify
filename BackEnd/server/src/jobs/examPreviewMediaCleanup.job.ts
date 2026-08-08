import pool from "~/config/db";
import { env } from "~/config/enviroment";
import {
  deleteCloudinaryResource,
  EXAM_PREVIEW_MEDIA_FOLDER,
  listResourcesByFolder,
  type CloudinaryListedResource,
} from "~/services/cloudinary.service";

function isOlderThan(resource: CloudinaryListedResource, maxAgeMs: number): boolean {
  const createdAt = Date.parse(resource.created_at);
  if (!Number.isFinite(createdAt)) return false;
  return Date.now() - createdAt >= maxAgeMs;
}

async function loadReferencedMediaUrls(urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set();
  const result = await pool.query<{ media_url: string }>(
    `SELECT media_url
     FROM questions
     WHERE media_url IS NOT NULL
       AND media_url = ANY($1::text[])`,
    [urls]
  );
  return new Set(result.rows.map((row) => row.media_url));
}

export async function runExamPreviewMediaCleanupTick(): Promise<void> {
  if (!env.CLOUDINARY_URL) return;

  const listed = await listResourcesByFolder(EXAM_PREVIEW_MEDIA_FOLDER);
  const staleResources = listed.filter((resource) =>
    isOlderThan(resource, env.CLOUDINARY_PREVIEW_MAX_AGE_MS)
  );

  if (staleResources.length === 0) return;

  const referencedUrls = await loadReferencedMediaUrls(
    staleResources.flatMap((resource) => [resource.secure_url, resource.url]).filter(Boolean)
  );

  for (const resource of staleResources) {
    const isReferenced =
      referencedUrls.has(resource.secure_url) || referencedUrls.has(resource.url);
    if (isReferenced) continue;

    try {
      await deleteCloudinaryResource(resource.public_id, resource.resource_type);
      console.log(`[preview-media-cleanup] deleted orphan ${resource.public_id}`);
    } catch (error) {
      console.error(
        `[preview-media-cleanup] failed to delete ${resource.public_id}`,
        error
      );
    }
  }
}

export function startExamPreviewMediaCleanupScheduler(): NodeJS.Timeout {
  void runExamPreviewMediaCleanupTick().catch((error) => {
    console.error("[preview-media-cleanup] first tick failed", error);
  });

  return setInterval(() => {
    void runExamPreviewMediaCleanupTick().catch((error) => {
      console.error("[preview-media-cleanup] tick failed", error);
    });
  }, env.CLOUDINARY_PREVIEW_CLEANUP_INTERVAL_MS);
}
