import { S3Storage } from "coze-coding-dev-sdk";
import { createReadStream } from "fs";
import { statSync } from "fs";

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  bucketName: process.env.COZE_BUCKET_NAME,
});

export async function uploadDeployPackage() {
  const filePath = "/workspace/projects/public/bangbangwenfa-deploy.tar.gz";
  const fileSize = statSync(filePath).size;
  
  console.log(`Uploading deploy package: ${fileSize} bytes`);
  
  const stream = createReadStream(filePath);
  const key = await storage.streamUploadFile({
    stream,
    fileName: "bangbangwenfa-deploy.tar.gz",
    contentType: "application/gzip",
  });
  
  console.log(`Uploaded to key: ${key}`);
  
  // Generate download URL (valid for 7 days)
  const downloadUrl = await storage.generatePresignedUrl({
    key,
    expireTime: 7 * 24 * 60 * 60, // 7 days
  });
  
  console.log(`Download URL: ${downloadUrl}`);
  
  return { key, downloadUrl };
}

// Run if called directly
uploadDeployPackage()
  .then((result) => {
    console.log("SUCCESS:", JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error("ERROR:", err);
    process.exit(1);
  });
