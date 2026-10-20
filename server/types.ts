import type { TeslaCamEvent } from '../src/types/index.ts';

export interface B2RawFile {
  fileName: string;
  contentLength?: number;
  uploadTimestamp?: number;
  [key: string]: unknown;
}

export interface ActiveB2Auth {
  bucketName: string | null;
  downloadUrl: string | null;
  downloadToken: string | null;
  keyId: string | null;
  appKey: string | null;
}

export interface B2OrganizeStats {
  totalFiles: number;
  eventCount: number;
}

export interface B2ParseResult {
  events: TeslaCamEvent[];
  stats: B2OrganizeStats;
}

export interface VideoCacheStatus {
  enabled: boolean;
  cacheDir: string;
  totalFiles: number;
  totalBytes: number;
  maxBytes: number;
}

export interface PreloadItem {
  file?: string;
  fileName?: string;
  url?: string;
}
