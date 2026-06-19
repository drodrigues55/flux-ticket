type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

function mockJwt(userId: string, role: 'ORGANIZER' | 'STAFF') {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value))
      .toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ userId, role })}.mocksignature`;
}

async function readJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  return { response, json };
}

async function check(name: string, fn: () => Promise<void>): Promise<CheckResult> {
  try {
    await fn();
    return { name, ok: true };
  } catch (error: any) {
    return { name, ok: false, detail: error?.message || String(error) };
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const apiReadUrl = process.env.API_READ_URL || 'http://localhost:3002';
  const apiWriteUrl = process.env.API_WRITE_URL || 'http://localhost:4000';
  const organizerToken = mockJwt('smoke-organizer', 'ORGANIZER');
  const staffToken = mockJwt('smoke-staff', 'STAFF');

  const results = await Promise.all([
    check('api-read health envelope', async () => {
      const { response, json } = await readJson(`${apiReadUrl}/health/live`);
      assert(response.ok, `expected 2xx, got ${response.status}`);
      assert(json?.data?.service === 'api-read', 'missing api-read service');
      assert(json?.meta?.requestId, 'missing requestId');
    }),
    check('api-write health envelope', async () => {
      const { response, json } = await readJson(`${apiWriteUrl}/health/live`);
      assert(response.ok, `expected 2xx, got ${response.status}`);
      assert(json?.data?.service === 'api-write', 'missing api-write service');
      assert(json?.meta?.requestId, 'missing requestId');
    }),
    check('dashboard overview envelope', async () => {
      const { response, json } = await readJson(`${apiReadUrl}/dashboard/overview`, {
        headers: { Authorization: `Bearer ${organizerToken}` },
      });
      assert(response.ok, `expected 2xx, got ${response.status}`);
      assert(json?.data?.globalKpis, 'missing dashboard data');
      assert(json?.meta?.requestId, 'missing requestId');
    }),
    check('staff bundle compatibility error envelope', async () => {
      const { response, json } = await readJson(`${apiReadUrl}/staff/events/non-existent-event/offline-bundle`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      assert(response.status === 404, `expected 404, got ${response.status}`);
      assert(json?.error?.code === 'EVENT_NOT_FOUND', 'missing EVENT_NOT_FOUND');
      assert(json?.error?.requestId, 'missing error requestId');
    }),
    check('checkout validation compatibility error envelope', async () => {
      const { response, json } = await readJson(`${apiWriteUrl}/tickets/renew-lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      assert(response.status === 400, `expected 400, got ${response.status}`);
      assert(json?.error?.statusCode === 400, 'missing error envelope');
      assert(json?.error?.requestId, 'missing error requestId');
    }),
  ]);

  for (const result of results) {
    console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.detail ? ` - ${result.detail}` : ''}`);
  }

  if (results.some((result) => !result.ok)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
