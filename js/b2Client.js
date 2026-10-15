/**
 * B2Client - Simplified client that offloads parsing to the local server
 */
class B2Client {
    /**
     * Call the local server to parse the B2 bucket
     */
    async parseBucket(keyId, appKey, bucketName) {
        const response = await fetch('/api/b2/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyId, appKey, bucketName })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || response.statusText);
        }

        return await response.json();
    }
}

window.B2Client = B2Client;
