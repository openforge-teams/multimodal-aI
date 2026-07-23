import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export interface UploadOptions {
  userId: string;
  assetId: string;
  type: 'image' | 'video' | 'thumbnail' | 'workspace';
  data: Buffer | Uint8Array | ReadableStream | string;
  contentType?: string;
  filename?: string;
}

function buildObjectPath(options: UploadOptions): string {
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

export async function uploadAsset(options: UploadOptions): Promise<string> {
  const key = buildObjectPath(options);
  const fullPath = path.join(UPLOAD_DIR, key);

  ensureDir(path.dirname(fullPath));

  let data: Buffer;
  if (typeof options.data === 'string') {
    data = Buffer.from(options.data);
  } else if (options.data instanceof Uint8Array) {
    data = Buffer.from(options.data);
  } else if (options.data instanceof Buffer) {
    data = options.data;
  } else {
    // ReadableStream
    const reader = options.data.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    data = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  }

  fs.writeFileSync(fullPath, data);
  return key;
}

export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  // 本地存储不需要签名 URL
  return getPublicUrl(key);
}

export async function getPublicUrl(key: string): Promise<string> {
  // 如果是完整 URL 直接返回
  if (key.startsWith('http://') || key.startsWith('https://') || key.startsWith('data:')) {
    return key;
  }
  // 本地存储使用 /uploads 路径
  return `/uploads/${key}`;
}

export async function deleteAsset(key: string): Promise<void> {
  const fullPath = path.join(UPLOAD_DIR, key);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

export { UPLOAD_DIR };
