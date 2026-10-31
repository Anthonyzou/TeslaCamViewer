import { onScopeDispose, ref, type Ref } from 'vue';
import type { TrafficSnapshot } from '../types';
import { bytesPerSecond } from '../utils/networkTraffic';

const POLL_INTERVAL_MS = 2000;

function isTrafficSnapshot(value: unknown): value is TrafficSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.uploadBytes === 'number' &&
    typeof v.downloadBytes === 'number' &&
    typeof v.since === 'string'
  );
}

export function useNetworkTraffic() {
  const snapshot: Ref<TrafficSnapshot | null> = ref(null);
  const uploadRate = ref(0);
  const downloadRate = ref(0);
  const error: Ref<string | null> = ref(null);

  let timer: ReturnType<typeof setInterval> | null = null;
  let previous: { snapshot: TrafficSnapshot; at: number } | null = null;

  async function poll(): Promise<void> {
    try {
      const response = await fetch('/api/traffic');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body: unknown = await response.json();
      if (!isTrafficSnapshot(body)) {
        throw new Error('Unexpected /api/traffic response');
      }
      const now = Date.now();
      if (previous) {
        const rates = bytesPerSecond(previous.snapshot, body, now - previous.at);
        uploadRate.value = rates.upload;
        downloadRate.value = rates.download;
      }
      previous = { snapshot: body, at: now };
      snapshot.value = body;
      error.value = null;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    }
  }

  function start(): void {
    if (timer) return;
    void poll();
    timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
  }

  function stop(): void {
    if (timer) clearInterval(timer);
    timer = null;
    previous = null;
    uploadRate.value = 0;
    downloadRate.value = 0;
  }

  onScopeDispose(stop);

  return { snapshot, uploadRate, downloadRate, error, start, stop };
}
