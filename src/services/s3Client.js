import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: "http://150.230.103.221:9000",
    forcePathStyle: true, // Needed for MinIO usually
    credentials: {
        accessKeyId: "minioadmin",
        secretAccessKey: "OracleMinio2026!",
    },
});

export const BUCKET_NAME = "file-share"; // Default bucket name, checking if user specified one... they didn't. I'll default to 'file-share' or list buckets.
// Actually, I should probably check for an existing bucket or use a default one. The user said "this folder's remote repo url", implying the project name "file-share".
// I'll assume "share" or "files" or "public". Let's stick with "file-share" for now and I can verify if it exists.
