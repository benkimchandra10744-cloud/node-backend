import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client;

function getConfig() {
  const { AWS_REGION, S3_BUCKET } = process.env;
  if (!AWS_REGION || !S3_BUCKET) {
    const error = new Error(
      "AWS_REGION and S3_BUCKET must be configured for image storage."
    );
    error.name = "ImageStorageConfigurationError";
    throw error;
  }
  return { region: AWS_REGION, bucket: S3_BUCKET };
}

export function getImageStorageErrorMessage(error) {
  if (error?.name === "ImageStorageConfigurationError") {
    return "Set AWS_REGION and S3_BUCKET in your .env file, then restart the app.";
  }
  if (
    error?.name === "CredentialsProviderError" ||
    /could not load credentials/i.test(error?.message || "")
  ) {
    return "AWS credentials are not configured. Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to your local .env file, or configure an AWS profile or role, then restart the app.";
  }
  if (error?.name === "AccessDenied" || error?.Code === "AccessDenied") {
    return "AWS denied access to this bucket. Grant this app s3:PutObject, s3:GetObject, and s3:DeleteObject permissions for the bucket.";
  }
  if (error?.name === "NoSuchBucket" || error?.Code === "NoSuchBucket") {
    return "The configured S3 bucket was not found. Check S3_BUCKET and make sure AWS_REGION matches the bucket's region.";
  }
  if (
    error?.name === "PermanentRedirect" ||
    error?.name === "AuthorizationHeaderMalformed"
  ) {
    return "The AWS region does not match the S3 bucket's region. Update AWS_REGION to the bucket's actual region.";
  }
  return null;
}

function getClient(region) {
  if (!client) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
    const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();

    client = new S3Client({
      region,
      ...(accessKeyId && secretAccessKey
        ? {
            credentials: {
              accessKeyId,
              secretAccessKey,
              ...(sessionToken ? { sessionToken } : {})
            }
          }
        : {})
    });
  }
  return client;
}

export async function uploadToS3({ key, buffer, contentType }) {
  const { region, bucket } = getConfig();
  await getClient(region).send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentDisposition: "inline"
    })
  );
}

export async function deleteFromS3(key) {
  const { region, bucket } = getConfig();
  await getClient(region).send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key })
  );
}

export async function createImageUrl(key) {
  const { region, bucket } = getConfig();
  return getSignedUrl(
    getClient(region),
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 900 }
  );
}
