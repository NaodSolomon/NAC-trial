const chunks = [];

for await (const chunk of process.stdin) {
  chunks.push(chunk);
}

const configuration = JSON.parse(Buffer.concat(chunks).toString('utf8'));
const uptimeKuma = configuration.services?.['uptime-kuma'];

if (!uptimeKuma) {
  throw new Error(
    'The production Compose configuration must include Uptime Kuma.',
  );
}

if (String(uptimeKuma.labels?.['traefik.enable']) !== 'false') {
  throw new Error(
    'Uptime Kuma must not be exposed through the public Traefik proxy.',
  );
}

const hasTraefikRouter = Object.keys(uptimeKuma.labels ?? {}).some((label) =>
  label.startsWith('traefik.http.routers.'),
);

if (hasTraefikRouter) {
  throw new Error('Uptime Kuma must not define a public Traefik router.');
}

const hasLoopbackBinding = (uptimeKuma.ports ?? []).some(
  (port) =>
    port.host_ip === '127.0.0.1' &&
    Number(port.target) === 3001 &&
    Number(port.published) === 3001,
);

if (!hasLoopbackBinding) {
  throw new Error(
    'Uptime Kuma must bind port 3001 only to the host loopback interface.',
  );
}

console.log('PRODUCTION_MONITORING_ACCESS_RESTRICTED');
