import { prisma } from '@flux/database';
import Redis from 'ioredis';

type Check = {
  name: string;
  ok: boolean;
  detail?: string;
};

const checks: Check[] = [];

function assertCheck(condition: unknown, name: string, detail?: string) {
  if (condition) {
    checks.push({ name, ok: true, detail });
  } else {
    checks.push({ name, ok: false, detail });
  }
}

async function main() {
  console.log('=== STARTING PRODUCTION SMOKE TEST ===\n');

  // 1. Database Connectivity
  console.log('Checking database connectivity...');
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const elapsed = Date.now() - start;
    assertCheck(true, 'Database Connection', `Successfully queried SELECT 1 in ${elapsed}ms`);
  } catch (err: any) {
    assertCheck(false, 'Database Connection', err.message || String(err));
  }

  // 2. Redis Connectivity
  console.log('Checking Redis connectivity...');
  const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL)
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      });

  try {
    const start = Date.now();
    const pong = await redis.ping();
    const elapsed = Date.now() - start;
    assertCheck(pong === 'PONG', 'Redis Connection', `PING returned PONG in ${elapsed}ms`);
  } catch (err: any) {
    assertCheck(false, 'Redis Connection', err.message || String(err));
  } finally {
    redis.disconnect();
  }

  // 3. API Read Services Health & Telemetry
  console.log('Checking api-read service...');
  const apiReadPort = process.env.PORT || 3002;
  const apiReadUrl = `http://localhost:${apiReadPort}`;
  try {
    const resLive = await fetch(`${apiReadUrl}/health/live`);
    assertCheck(resLive.ok, 'api-read /health/live', `Status: ${resLive.status}`);

    const resReady = await fetch(`${apiReadUrl}/health/ready`);
    assertCheck(resReady.ok, 'api-read /health/ready', `Status: ${resReady.status}`);

    const resVersion = await fetch(`${apiReadUrl}/version`);
    assertCheck(resVersion.ok, 'api-read /version', `Status: ${resVersion.status}`);

    const resCatalog = await fetch(`${apiReadUrl}/events`);
    assertCheck(resCatalog.ok, 'api-read /events (Catalog read route)', `Status: ${resCatalog.status}`);
  } catch (err: any) {
    assertCheck(false, 'api-read Endpoints', `Failed to reach api-read: ${err.message}`);
  }

  // 4. API Write Services Health & Throttling/Validation Error Envelopes
  console.log('Checking api-write service...');
  const apiWritePort = 4000;
  const apiWriteUrl = `http://localhost:${apiWritePort}`;
  try {
    const resLive = await fetch(`${apiWriteUrl}/health/live`);
    assertCheck(resLive.ok, 'api-write /health/live', `Status: ${resLive.status}`);

    const resReady = await fetch(`${apiWriteUrl}/health/ready`);
    assertCheck(resReady.ok, 'api-write /health/ready', `Status: ${resReady.status}`);

    // Verify checkout validation error envelope
    const resCheckout = await fetch(`${apiWriteUrl}/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // malformed request
    });
    const checkoutErrBody = await resCheckout.json() as any;
    assertCheck(
      (resCheckout.status === 400 || resCheckout.status === 422) && !!checkoutErrBody.error && !!checkoutErrBody.error.code,
      'api-write Checkout Error Envelope',
      `Checked: status ${resCheckout.status} received, error code present: ${checkoutErrBody.error?.code}`
    );

    // Verify staff mutation error envelope
    const resStaff = await fetch(`${apiWriteUrl}/events/some-event-id/staff-mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const staffErrBody = await resStaff.json();
    assertCheck(
      resStaff.status === 401 || resStaff.status === 403,
      'api-write Staff Mutation Guard',
      `Checked: status ${resStaff.status} received`
    );
  } catch (err: any) {
    assertCheck(false, 'api-write Endpoints', `Failed to reach api-write: ${err.message}`);
  }

  // 5. Output Final Telemetry Results
  console.log('\n=== SMOKE TEST SUMMARY ===');
  let exitCode = 0;
  for (const check of checks) {
    if (check.ok) {
      console.log(`[PASS] ${check.name}: ${check.detail || ''}`);
    } else {
      console.error(`[FAIL] ${check.name}: ${check.detail || ''}`);
      exitCode = 1;
    }
  }

  console.log('\n=== SMOKE TEST COMPLETED ===');
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('Smoke test execution error:', err);
  process.exit(1);
});
