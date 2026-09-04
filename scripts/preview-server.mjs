import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.cwd(), '_site');
const host = '127.0.0.1';
const preferredPort = Number(process.env.BLOG_PREVIEW_PORT || 4000);
const candidatePorts = [...new Set([preferredPort, 4173, 8080, 3000, 0])];
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let filePath = path.resolve(root, `.${pathname}`);
    if (!filePath.startsWith(root)) throw new Error('Invalid path');
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = path.join(filePath, 'index.html');
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

async function verifyPreview(port) {
  const previewUrl = `http://${host}:${port}/blog/`;
  const routes = [
    previewUrl,
    `${previewUrl}archives/`,
    `${previewUrl}about/`,
    `${previewUrl}favorites/`,
    `${previewUrl}posts/title/`,
    `${previewUrl}404.html`,
    `${previewUrl}zh/`,
    `${previewUrl}zh/archives/`,
    `${previewUrl}zh/about/`,
    `${previewUrl}zh/favorites/`,
    `${previewUrl}zh/posts/title/`,
    `${previewUrl}zh/404.html`,
  ];
  for (const route of routes) {
    const response = await fetch(route);
    if (!response.ok) throw new Error(`Preview check failed: ${route} (${response.status})`);
  }
  process.stdout.write(`Local preview ready: ${previewUrl}\n`);
}

function listen(portIndex = 0) {
  const port = candidatePorts[portIndex];

  const handleError = (error) => {
    server.removeListener('listening', handleListening);
    if (error.code === 'EADDRINUSE' && portIndex < candidatePorts.length - 1) {
      process.stdout.write(`Port ${port} is busy; trying another local port…\n`);
      listen(portIndex + 1);
      return;
    }
    throw error;
  };

  const handleListening = async () => {
    server.removeListener('error', handleError);
    const address = server.address();
    try {
      await verifyPreview(address.port);
    } catch (error) {
      server.close();
      throw error;
    }
  };

  server.once('error', handleError);
  server.once('listening', handleListening);
  server.listen(port, host);
}

listen();
