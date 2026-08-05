const DEFAULT_MAILPIT_API_URL = 'http://127.0.0.1:8026';

export async function clearMailpitMailbox(): Promise<void> {
  const response = await fetch(`${mailpitApiUrl()}/api/v1/messages`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Mailpit cleanup failed with HTTP ${response.status}`);
}

export async function waitForMailpitText(expectedText: string, timeoutMs = 5_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(`${mailpitApiUrl()}/view/latest.txt`);
    if (response.ok) {
      const text = await response.text();
      if (text.includes(expectedText)) return text;
    }
    await delay(50);
  }

  throw new Error(`Mailpit did not receive the expected message within ${timeoutMs}ms`);
}

function mailpitApiUrl(): string {
  return (process.env.TEST_MAILPIT_API_URL ?? DEFAULT_MAILPIT_API_URL).replace(/\/$/, '');
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
