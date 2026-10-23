import { ref, type Ref } from 'vue';

export interface B2Config {
  isConfigured: boolean;
  isPreloaded?: boolean;
  bucketName?: string;
}

export class B2Client {
  async getConfig(): Promise<B2Config> {
    try {
      const response = await fetch('/api/b2/config');
      if (!response.ok) return { isConfigured: false, isPreloaded: false };
      return await response.json();
    } catch (e) {
      console.error('Failed to fetch B2 config:', e);
      return { isConfigured: false, isPreloaded: false };
    }
  }

  async parseBucket(
    keyId?: string,
    appKey?: string,
    bucketName?: string,
    forceRefresh: boolean = false
  ): Promise<any> {
    const response = await fetch('/api/b2/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyId,
        appKey,
        bucketName,
        refresh: forceRefresh,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || response.statusText);
    }

    return await response.json();
  }
}

export const b2Client = new B2Client();

export function useB2() {
  const isConfigured: Ref<boolean> = ref(false);
  const isPreloaded: Ref<boolean> = ref(false);
  const isLoading: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);

  async function checkConfig(): Promise<B2Config> {
    isLoading.value = true;
    error.value = null;
    try {
      const config = await b2Client.getConfig();
      isConfigured.value = !!config.isConfigured;
      isPreloaded.value = !!config.isPreloaded;
      return config;
    } catch (err: any) {
      error.value = err.message || 'Failed to check B2 configuration';
      return { isConfigured: false, isPreloaded: false };
    } finally {
      isLoading.value = false;
    }
  }

  return {
    isConfigured,
    isPreloaded,
    isLoading,
    error,
    client: b2Client,
    checkConfig,
    getConfig: b2Client.getConfig.bind(b2Client),
    parseBucket: b2Client.parseBucket.bind(b2Client),
  };
}

export default useB2;
