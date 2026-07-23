import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (s3Client) return s3Client;

  const endpoint = process.env.S3_ENDPOINT;
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;
  const region = process.env.S3_REGION || 'us-east-1';

  if (!endpoint || !accessKey || !secretKey) {
    throw new Error('S3 configuration missing. Please set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY');
  }

  s3Client = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true, // MinIO 需要
  });

  return s3Client;
}

export interface UploadOptions {
  userId: string;
  assetId: string;
  type: 'image' | 'video' | 'thumbnail' | 'workspace';
  data: Buffer | Uint8Array | ReadableStream | string;
  contentType?: string;
  filename?: string;
}

export async function uploadAsset(options: UploadOptions): Promise<string> {
  const client = getClient();
  const bucket = process.env.S3_BUCKET || 'dreamforge';

  const key = buildObjectKey(options);

  const input: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: options.data as any,
    ContentType: options.contentType || inferContentType(options.type, options.filename),
  };

  await client.send(new PutObjectCommand(input));

  return key;
}

export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  const client = getClient();
  const bucket = process.env.S3_BUCKET || 'dreamforge';

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function getPublicUrl(key: string): string {
  const endpoint = process.env.S3_ENDPOINT || '';
  const bucket = process.env.S3_BUCKET || 'dreamforge';

  // 移除末尾斜杠
  const cleanEndpoint = endpoint.replace(/\/$/, '');

  // 如果是 MinIO 本地开发，使用 path style
  if (cleanEndpoint.includes('localhost') || cleanEndpoint.includes('127.0.0.1')) {
    return `${cleanEndpoint}/${bucket}/${key}`;
  }

  // 生产环境使用虚拟主机风格
  const url = new URL(cleanEndpoint);
  return `${url.protocol}//${bucket}.${url.host}/${key}`;
}

export async function deleteAsset(key: string): Promise<void> {
  const client = getClient();
  const bucket = process.env.S3_BUCKET || 'dreamforge';

  await client.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  }));
}

function buildObjectKey(options: UploadOptions): string {
  const { userId, assetId, type } = options;

  switch (type) {
    case 'image':
      return `users/${userId}/images/${assetId}.png`;
    case 'video':
      return `users/${userId}/videos/${assetId}.mp4`;
    case 'thumbnail':
      return `users/${userId}/thumbnails/${assetId}.jpg`;
    case 'workspace':
      return `users/${userId}/workspaces/${assetId}.json`;
    default:
      return `users/${userId}/${assetId}`;
  }
}

function inferContentType(type: string, filename?: string): string {
  if (filename) {
    if (filename.endsWith('.png')) return 'image/png';
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
    if (filename.endsWith('.webp')) return 'image/webp';
    if (filename.endsWith('.mp4')) return 'video/mp4';
    if (filename.endsWith('.webm')) return 'video/webm';
  }

  switch (type) {
    case 'image':
      return 'image/png';
    case 'video':
      return 'video/mp4';
    case 'thumbnail':
      return 'image/jpeg';
    case 'workspace':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

export { getClient };
