import { s3Client, BUCKET_NAME } from './src/services/s3Client.js';
import { ListBucketsCommand, CreateBucketCommand } from "@aws-sdk/client-s3";

async function ensureBucket() {
    console.log("Checking buckets...");
    try {
        const listCmd = new ListBucketsCommand({});
        const res = await s3Client.send(listCmd);
        console.log("Existing buckets:", res.Buckets?.map(b => b.Name).join(", "));

        const exists = res.Buckets?.some(b => b.Name === BUCKET_NAME);

        if (!exists) {
            console.log(`Bucket '${BUCKET_NAME}' not found. Creating...`);
            const createCmd = new CreateBucketCommand({ Bucket: BUCKET_NAME });
            await s3Client.send(createCmd);
            console.log(`Bucket '${BUCKET_NAME}' created successfully.`);
        } else {
            console.log(`Bucket '${BUCKET_NAME}' already exists.`);
        }
    } catch (err) {
        console.error("Bucket operation failed:", err);
        process.exit(1);
    }
}

ensureBucket();
