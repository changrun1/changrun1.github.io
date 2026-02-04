import { s3Client, BUCKET_NAME } from './src/services/s3Client.js';
import { PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

async function configureCors() {
    console.log(`Configuring CORS for bucket: ${BUCKET_NAME}...`);
    try {
        const corsParams = {
            Bucket: BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
                        AllowedOrigins: ["*"], // Allow all for now to rule out origin mismatch
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3000
                    }
                ]
            }
        };

        const command = new PutBucketCorsCommand(corsParams);
        await s3Client.send(command);
        console.log("CORS configuration updated successfully.");

        // Verify
        const getCors = new GetBucketCorsCommand({ Bucket: BUCKET_NAME });
        const res = await s3Client.send(getCors);
        console.log("Current CORS Rules:", JSON.stringify(res.CORSRules, null, 2));

    } catch (err) {
        console.error("CORS configuration failed:", err);
    }
}

configureCors();
