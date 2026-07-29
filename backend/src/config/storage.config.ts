import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  endpoint: process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000',
  region: process.env.STORAGE_REGION ?? 'auto',
  bucket: process.env.STORAGE_BUCKET ?? 'nehemiah-media',
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? 'minioadmin',
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? 'minioadmin',
  publicUrl: (process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:9000/nehemiah-media').replace(
    /\/+$/,
    '',
  ),
  maxFileSizeBytes: Number(process.env.MEDIA_MAX_FILE_SIZE_BYTES ?? 10_485_760),
}));
