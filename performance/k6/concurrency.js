import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const baseUrl = (__ENV.BASE_URL || 'http://backend:8000').replace(/\/+$/, '');
const targetVus = positiveInteger(__ENV.TARGET_VUS, 500, 'TARGET_VUS');
const thinkTimeSeconds = positiveNumber(__ENV.THINK_TIME_SECONDS, 1, 'THINK_TIME_SECONDS');
const endpoints = [
  { name: 'liveness', path: '/api/v1/system/health/live' },
  { name: 'homepage', path: '/api/v1/public/content/homepage?languageCode=en' },
  { name: 'settings', path: '/api/v1/settings' },
  { name: 'navigation', path: '/api/v1/navigation?languageCode=en' },
  { name: 'events', path: '/api/v1/public/events?languageCode=en&page=1&limit=10' },
];

const unexpectedStatus = new Rate('unexpected_status');

export const options = {
  scenarios: {
    concurrent_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: __ENV.RAMP_DURATION || '1m', target: targetVus },
        { duration: __ENV.HOLD_DURATION || '2m', target: targetVus },
        { duration: __ENV.RAMP_DOWN_DURATION || '30s', target: 0 },
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<750', 'p(99)<1500'],
    unexpected_status: ['rate<0.01'],
  },
};

export function setup() {
  for (const endpoint of endpoints) {
    const response = http.get(`${baseUrl}${endpoint.path}`, {
      tags: { endpoint: endpoint.name, phase: 'preflight' },
    });
    if (response.status !== 200) {
      fail(`Preflight ${endpoint.name} returned HTTP ${response.status}; seed the benchmark database`);
    }
  }
}

export default function () {
  const endpoint = endpoints[(__VU + __ITER) % endpoints.length];
  const response = http.get(`${baseUrl}${endpoint.path}`, {
    tags: { endpoint: endpoint.name, phase: 'load' },
  });
  const accepted = check(response, {
    [`${endpoint.name} returns 200`]: (result) => result.status === 200,
  });
  unexpectedStatus.add(!accepted);
  sleep(thinkTimeSeconds);
}

function positiveInteger(raw, fallback, name) {
  const value = Number(raw || fallback);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

function positiveNumber(raw, fallback, name) {
  const value = Number(raw || fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number`);
  return value;
}
