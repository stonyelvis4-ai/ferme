import { createServer } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';

const backendEnvironment = readEnvironment(resolve('backend-laravel13-git/.env'));
const apiKey = process.env.GEMINI_API_KEY || backendEnvironment.GEMINI_API_KEY || '';
const expectedToken = process.env.GEMINI_LOCAL_PROXY_TOKEN || backendEnvironment.GEMINI_LOCAL_PROXY_TOKEN || '';
const port = Number(process.env.GEMINI_LOCAL_PROXY_PORT || backendEnvironment.GEMINI_LOCAL_PROXY_PORT || 8038);
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;

if (!apiKey || !expectedToken || !Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('Gemini local proxy is missing its local configuration.');
  process.exit(1);
}

const server = createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/') {
    sendJson(response, 404, { message: 'Not found.' });
    return;
  }

  if (!matchesToken(String(request.headers['x-ferm-local-proxy-token'] || ''), expectedToken)) {
    sendJson(response, 403, { message: 'Forbidden.' });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const model = typeof body.model === 'string' ? body.model.trim() : '';
    const generationRequest = body.request;

    if (!/^[A-Za-z0-9._-]{3,120}$/.test(model) || !generationRequest || typeof generationRequest !== 'object') {
      sendJson(response, 422, { message: 'Invalid request.' });
      return;
    }

    const upstream = await requestGemini(model, generationRequest, apiKey);
    response.writeHead(upstream.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(upstream.body);
  } catch {
    sendJson(response, 502, { message: 'Gemini local proxy is temporarily unavailable.' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`FERM+ Gemini local proxy listening on 127.0.0.1:${port}`);
});

function readEnvironment(filePath) {
  try {
    return Object.fromEntries(
      readFileSync(filePath, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const separator = line.indexOf('=');
          const key = line.slice(0, separator).trim();
          const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
          return [key, value];
        })
    );
  } catch {
    return {};
  }
}

function matchesToken(received, expected) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function readJsonBody(request) {
  return new Promise((resolveBody, reject) => {
    let body = '';
    let bodyLength = 0;
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      bodyLength += Buffer.byteLength(chunk);
      if (bodyLength > MAX_REQUEST_BYTES) request.destroy();
    });
    request.on('end', () => {
      try {
        resolveBody(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON.'));
      }
    });
    request.on('error', reject);
  });
}

function requestGemini(model, payload, key) {
  return new Promise((resolveRequest, reject) => {
    const serialized = JSON.stringify(payload);
    const upstream = httpsRequest({
      hostname: 'generativelanguage.googleapis.com',
      method: 'POST',
      path: `/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(serialized),
        'x-goog-api-key': key,
      },
      timeout: 25_000,
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolveRequest({ status: response.statusCode || 502, body }));
    });

    upstream.on('timeout', () => upstream.destroy(new Error('Gemini timeout.')));
    upstream.on('error', reject);
    upstream.end(serialized);
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}
