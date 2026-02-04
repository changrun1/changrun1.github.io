import { s3Client, BUCKET_NAME } from './src/services/s3Client.js';
import { ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { GetObjectCommand } from "@aws-sdk/client-s3"

async function verify() {
    console.log("Checking S3 connection...");
    try {
        const command = new ListObjectsV2Command({ Bucket: BUCKET_NAME });
        const res = await s3Client.send(command);
        console.log("Successfully listed bucket!");
        console.log("File count:", res.Contents?.length || 0);

        // Create a temporary test file
        const testKey = `test-${Date.now()}.txt`;
        console.log("Uploading test file:", testKey);
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: testKey,
            Body: "Hello S3",
        }));
        console.log("Upload successful.");

        // Generate URL
        const getCmd = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: testKey });
        const url = await getSignedUrl(s3Client, getCmd, { expiresIn: 60 });
        console.log("Generated signed URL:", url);

        // Delete
        console.log("Deleting test file...");
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: testKey }));
        console.log("Delete successful.");

    } catch (err) {
        console.error("Verification FAILED:", err);
        process.exit(1);
    }
}

verify();
