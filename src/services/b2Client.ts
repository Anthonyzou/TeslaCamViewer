/**
 * B2Client - Simplified client that offloads parsing to the local server
 */
export class B2Client {
  /**
   * Get the server-side B2 configuration status
   */
  async getConfig() {
    try {
      const response = await fetch('/api/b2/config');
      if (!response.ok) return { isConfigured: false, isPreloaded: false };
      return await response.json();
    } catch (e) {
      console.error('Failed to fetch B2 config:', e);
      return { isConfigured: false, isPreloaded: false };
    }
  }

  /**
   * Call the local server to parse the B2 bucket
   */
  async parseBucket(keyId, appKey, bucketName, forceRefresh = false) {
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
export default B2Client;
