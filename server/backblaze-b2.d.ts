declare module 'backblaze-b2' {
  export interface B2Options {
    applicationKeyId: string;
    applicationKey: string;
    axios?: {
      httpAgent?: unknown;
      httpsAgent?: unknown;
    };
  }

  export interface B2Bucket {
    bucketName: string;
    bucketId: string;
    [key: string]: unknown;
  }

  export interface B2FileEntry {
    fileName: string;
    contentLength?: number;
    uploadTimestamp?: number;
    [key: string]: unknown;
  }

  export default class B2 {
    constructor(options: B2Options);
    authorize(): Promise<{ data: unknown }>;
    getBucket(params: {
      bucketName: string;
    }): Promise<{ data: { buckets: B2Bucket[] } }>;
    listFileNames(params: {
      bucketId: string;
      startFileName?: string | null;
      maxFileCount?: number;
    }): Promise<{
      data: { files: B2FileEntry[]; nextFileName?: string | null };
    }>;
    getDownloadAuthorization(params: {
      bucketId: string;
      fileNamePrefix: string;
      validDurationInSeconds: number;
    }): Promise<{ data: { authorizationToken: string } }>;
    downloadUrl: string;
  }
}
