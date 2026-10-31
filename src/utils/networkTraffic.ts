import type { TrafficSnapshot } from '../types';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1
  );
  const value = bytes / 1024 ** exponent;
  const digits = exponent === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${UNITS[exponent]}`;
}

export function formatRate(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function bytesPerSecond(
  previous: TrafficSnapshot,
  current: TrafficSnapshot,
  elapsedMs: number
): { upload: number; download: number } {
  if (elapsedMs <= 0) return { upload: 0, download: 0 };
  const seconds = elapsedMs / 1000;
  return {
    upload: Math.max(0, current.uploadBytes - previous.uploadBytes) / seconds,
    download:
      Math.max(0, current.downloadBytes - previous.downloadBytes) / seconds,
  };
}
