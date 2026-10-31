import type http from 'node:http';
import net from 'node:net';
import type { TrafficSnapshot } from '../src/types/index.ts';

const startedAt = new Date();
const liveSockets = new Set<net.Socket>();
let closedUploadBytes = 0;
let closedDownloadBytes = 0;

// Socket counters cover every protocol path (static files, cached video, B2 API and downloads) without per-route bookkeeping
function trackSocket(socket: net.Socket): void {
  if (liveSockets.has(socket)) return;
  liveSockets.add(socket);
  socket.once('close', () => {
    closedUploadBytes += socket.bytesWritten;
    closedDownloadBytes += socket.bytesRead;
    liveSockets.delete(socket);
  });
}

export function trackInboundConnections(server: net.Server): void {
  server.on('connection', trackSocket);
}

export function trackOutboundAgent(agent: http.Agent): void {
  const createConnection = agent.createConnection;
  agent.createConnection = function (options, callback) {
    const socket = createConnection.call(this, options, callback);
    if (socket instanceof net.Socket) trackSocket(socket);
    return socket;
  };
}

export function getTrafficSnapshot(): TrafficSnapshot {
  let uploadBytes = closedUploadBytes;
  let downloadBytes = closedDownloadBytes;
  for (const socket of liveSockets) {
    uploadBytes += socket.bytesWritten;
    downloadBytes += socket.bytesRead;
  }
  return {
    uploadBytes,
    downloadBytes,
    since: startedAt.toISOString(),
  };
}
