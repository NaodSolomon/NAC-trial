export default async function globalSetup() {
  const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:8100/api/v1';
  const mailpitUrl = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8027';
  const minioUrl = process.env.E2E_MINIO_URL ?? 'http://localhost:9100';

  const readiness = await fetch(`${apiUrl}/system/health/ready`);
  if (!readiness.ok) throw new Error(`E2E API readiness failed with HTTP ${readiness.status}.`);
  const version = await jsonData(`${apiUrl}/system/version`);
  if (version.mode !== 'trial' || version.realPaymentsEnabled !== false) {
    throw new Error('E2E safety check failed: the backend is not in no-money trial mode.');
  }
  const mailpit = await fetch(`${mailpitUrl}/api/v1/messages`);
  if (!mailpit.ok) throw new Error(`Mailpit readiness failed with HTTP ${mailpit.status}.`);
  const minio = await fetch(`${minioUrl}/minio/health/live`);
  if (!minio.ok) throw new Error(`MinIO readiness failed with HTTP ${minio.status}.`);
}

async function jsonData(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  const body = (await response.json()) as { data?: Record<string, unknown> };
  return body.data ?? body;
}
