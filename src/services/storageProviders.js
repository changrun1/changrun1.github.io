import { s3Client, BUCKET_NAME } from './s3Client.js'
import { ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { GetObjectCommand } from "@aws-sdk/client-s3"

// S3 Provider Implementation
function createS3Provider() {
  async function list() {
    try {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
      });
      const response = await s3Client.send(command);

      const contents = response.Contents || [];

      // Map to expected format and generate signed URLs
      const files = await Promise.all(contents.map(async (item) => {
        const getCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: item.Key,
        });
        // Generate signed URL valid for 1 hour
        const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

        return {
          name: item.Key,
          path: item.Key, // S3 Key as path
          size: item.Size,
          downloadUrl: url,
          htmlUrl: url, // Use same URL for now
          updatedAt: item.LastModified,
          extension: item.Key.split('.').pop().toLowerCase(),
          isText: true, // Simplified
        };
      }));

      return files.sort((a, b) => b.updatedAt - a.updatedAt);

    } catch (err) {
      console.error("S3 List Error:", err);
      // If bucket doesn't exist or other error, return empty to avoid crash
      return [];
    }
  }

  async function upload(parts) {
    const { file, message, customName } = parts || {};
    if (!file && !message) throw new Error("No content to upload");

    const nowTs = new Date().toISOString().replace(/[:.]/g, '-');
    let key = customName || file?.name || `upload-${nowTs}.txt`;

    // Simple sanitization
    key = key.trim().replace(/\s+/g, '-');

    let body;
    let contentType = 'application/octet-stream';

    if (file instanceof File) {
      body = file;
      contentType = file.type || 'application/octet-stream';
    } else {
      body = message;
      contentType = 'text/plain';
      if (!key.includes('.')) key += '.txt';
    }

    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
      });

      await s3Client.send(command);
      return { message: "Upload success", key };
    } catch (err) {
      console.error("S3 Upload Error:", err);
      throw new Error("Upload failed: " + err.message);
    }
  }

  async function deleteOne(path) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: path,
      });
      await s3Client.send(command);
      return { message: "Deleted", path };
    } catch (err) {
      console.error("S3 Delete Error:", err);
      throw new Error("Delete failed");
    }
  }

  async function deleteAll() {
    // S3 doesn't have a "delete all" command, need to list then delete.
    // For safety, implementing one by one or batch.
    const files = await list();
    for (const f of files) {
      await deleteOne(f.path);
    }
    return { message: "All deleted" };
  }

  return {
    id: 's3-direct',
    label: 'Oracle S3 Direct',
    capabilities: { list: true, upload: true, delete: true, deleteAll: true },
    list,
    upload,
    delete: deleteOne,
    deleteAll,
  }
}

export function listProviders() {
  // Always return the S3 provider
  return [createS3Provider()];
}
