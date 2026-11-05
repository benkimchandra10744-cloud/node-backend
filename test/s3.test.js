import assert from "node:assert/strict";
import { test } from "node:test";
import { getImageStorageErrorMessage } from "../services/s3.js";

test("S3 setup errors explain how to configure credentials", () => {
  const message = getImageStorageErrorMessage({
    name: "CredentialsProviderError",
    message: "Could not load credentials from any providers"
  });

  assert.match(message, /AWS_ACCESS_KEY_ID/);
  assert.match(message, /AWS_SECRET_ACCESS_KEY/);
  assert.match(message, /AWS profile or role/);
});

test("S3 permission and bucket errors give targeted guidance", () => {
  assert.match(
    getImageStorageErrorMessage({ name: "AccessDenied" }),
    /s3:PutObject/
  );
  assert.match(
    getImageStorageErrorMessage({ name: "NoSuchBucket" }),
    /AWS_REGION/
  );
  assert.equal(getImageStorageErrorMessage(new Error("other error")), null);
});
