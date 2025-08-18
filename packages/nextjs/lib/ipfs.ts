// lib/uploadToFilebase.ts

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import * as dagPB from "@ipld/dag-pb";

const s3 = new S3Client({
  endpoint: "https://s3.filebase.com",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.FILEBASE_KEY!,
    secretAccessKey: process.env.FILEBASE_SECRET!,
  },
});

export async function uploadToFilebase(
  name: string,
  data: any
): Promise<{ cid: string }> {
  const buffer = Buffer.from(JSON.stringify(data));

  // Upload to Filebase (S3-compatible)
  await s3.send(
    new PutObjectCommand({
      Bucket: "your-bucket-name",
      Key: `${name}.json`,
      Body: buffer,
      ContentType: "application/json",
    })
  );

  // 🔐 Optional: Generate IPFS CID manually from buffer
  const hash = await sha256.digest(buffer);
  const cid = CID.create(1, dagPB.code, hash);

  return { cid: cid.toString() };
}
