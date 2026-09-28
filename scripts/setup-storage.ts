/**
 * Creates (or updates) the private Supabase Storage buckets with their size and
 * type limits. Safe to re-run; it never deletes buckets or files.
 *   npm run storage:setup
 */
import { BUCKET_LIMITS, BUCKETS } from "../src/lib/domain/storage";
import { supabase } from "./_supabase";

async function main() {
  const storage = supabase().storage;
  const { data: existing, error } = await storage.listBuckets();
  if (error) throw error;
  for (const name of BUCKETS) {
    const limits = BUCKET_LIMITS[name];
    const options = {
      public: false,
      fileSizeLimit: limits.maxBytes,
      allowedMimeTypes: [...limits.types],
    };
    const found = existing.find((b) => b.name === name);
    const result = found ? await storage.updateBucket(name, options) : await storage.createBucket(name, options);
    if (result.error) throw result.error;
    console.log(`${found ? "Updated" : "Created"} private bucket "${name}" (≤ ${limits.maxBytes / 1024 / 1024} MB).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
