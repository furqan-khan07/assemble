// AWS S3 storage helpers.
// Uses @aws-sdk/client-s3; downloads are served via presigned GET URLs.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function getS3Client(): S3Client {
  if (!ENV.awsS3Bucket) {
    throw new Error(
      "S3 credentials missing: set AWS_S3_BUCKET (and optionally AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)"
    );
  }

  // If explicit credentials are provided, use them.
  // Otherwise the SDK falls back to the default credential chain
  // (env vars, IAM role, ~/.aws/credentials, etc.)
  const credentials =
    ENV.awsAccessKeyId && ENV.awsSecretAccessKey
      ? {
          accessKeyId: ENV.awsAccessKeyId,
          secretAccessKey: ENV.awsSecretAccessKey,
        }
      : undefined;

  return new S3Client({
    region: ENV.awsRegion,
    ...(credentials ? { credentials } : {}),
  });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * Upload a file to S3 and return a presigned GET URL for it.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const key = normalizeKey(relKey);

  const body =
    typeof data === "string" ? Buffer.from(data, "utf-8") : data;

  await client.send(
    new PutObjectCommand({
      Bucket: ENV.awsS3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // Return a presigned GET URL valid for 1 hour
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.awsS3Bucket, Key: key }),
    { expiresIn: 3600 }
  );

  return { key, url };
}

/**
 * Get a presigned download URL for an S3 object.
 */
export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const key = normalizeKey(relKey);

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.awsS3Bucket, Key: key }),
    { expiresIn: 3600 }
  );

  return { key, url };
}
