import assert from 'node:assert';
import http from 'node:http';
import { after, test } from 'node:test';
import { createJiti } from 'jiti';

const jiti = createJiti(process.cwd());
const { formatBytes, formatRate, bytesPerSecond } = jiti(
  './src/utils/networkTraffic.ts'
);
const { trackOutboundAgent, getTrafficSnapshot } = jiti('./server/networkTraffic.ts');

test('formatBytes - scales through units with one decimal under 100', () => {
  assert.strictEqual(formatBytes(0), '0 B');
  assert.strictEqual(formatBytes(512), '512 B');
  assert.strictEqual(formatBytes(1536), '1.5 KB');
  assert.strictEqual(formatBytes(5 * 1024 * 1024), '5.0 MB');
  assert.strictEqual(formatBytes(250 * 1024 * 1024), '250 MB');
});

test('formatBytes - caps at TB and ignores invalid input', () => {
  assert.strictEqual(formatBytes(2 * 1024 ** 5), '2048 TB');
  assert.strictEqual(formatBytes(-1), '0 B');
  assert.strictEqual(formatBytes(Number.NaN), '0 B');
});

test('formatRate - appends /s to the byte value', () => {
  assert.strictEqual(formatRate(2048), '2.0 KB/s');
});

test('bytesPerSecond - derives upload and download rates from snapshot deltas', () => {
  const previous = { uploadBytes: 1000, downloadBytes: 5000, since: 'x' };
  const current = { uploadBytes: 3000, downloadBytes: 9000, since: 'x' };
  assert.deepStrictEqual(bytesPerSecond(previous, current, 2000), {
    upload: 1000,
    download: 2000,
  });
});

test('bytesPerSecond - returns zero for a non-positive interval', () => {
  const snap = { uploadBytes: 1, downloadBytes: 1, since: 'x' };
  assert.deepStrictEqual(bytesPerSecond(snap, snap, 0), {
    upload: 0,
    download: 0,
  });
});

test('bytesPerSecond - never reports negative rates after a counter reset', () => {
  const previous = { uploadBytes: 5000, downloadBytes: 5000, since: 'x' };
  const current = { uploadBytes: 100, downloadBytes: 200, since: 'y' };
  assert.deepStrictEqual(bytesPerSecond(previous, current, 1000), {
    upload: 0,
    download: 0,
  });
});

test('outbound agent - counts response bytes pulled from upstream', async () => {
  const payload = 'x'.repeat(200000);
  const origin = http.createServer((_req, res) => res.end(payload));
  const agent = new http.Agent({ keepAlive: false });
  trackOutboundAgent(agent);
  await new Promise((resolve) => origin.listen(0, resolve));
  const port = origin.address().port;
  after(() => {
    agent.destroy();
    origin.close();
  });

  const before = getTrafficSnapshot();
  await new Promise((resolve, reject) => {
    http
      .get({ port, host: '127.0.0.1', agent, path: '/' }, (res) => {
        res.resume();
        res.on('end', resolve);
      })
      .on('error', reject);
  });
  const after1 = getTrafficSnapshot();

  assert.ok(after1.downloadBytes - before.downloadBytes >= payload.length);
});
