const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const APK_PATH = path.join(__dirname, 'app/build/outputs/apk/debug/app-debug.apk');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.apk': 'application/vnd.android.package-archive'
};

process.on('uncaughtException', (err) => {
  console.error('[PANU Server] Exception capturée:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[PANU Server] Rejet non géré:', reason);
});

const server = http.createServer((req, res) => {
  req.on('error', (err) => console.error('[PANU Server] Req error:', err));
  res.on('error', (err) => console.error('[PANU Server] Res error:', err));

  const urlPath = req.url.split('?')[0];

  // 1. APK Download
  if (urlPath === '/app-debug.apk' || urlPath === '/download') {
    if (fs.existsSync(APK_PATH)) {
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="panu-debug.apk"'
      });
      const stream = fs.createReadStream(APK_PATH);
      stream.on('error', () => res.end());
      return stream.pipe(res);
    }
  }

  // 2. Service Worker & Manifest
  if (urlPath === '/sw.js' || urlPath === '/service-worker.js') {
    const swPath = fs.existsSync(path.join(__dirname, 'sw.js')) 
      ? path.join(__dirname, 'sw.js') 
      : path.join(__dirname, 'service-worker.js');
    if (fs.existsSync(swPath)) {
      res.writeHead(200, { 
        'Content-Type': 'application/javascript; charset=utf-8',
        'Service-Worker-Allowed': '/'
      });
      const stream = fs.createReadStream(swPath);
      stream.on('error', () => res.end());
      return stream.pipe(res);
    }
  }

  if (urlPath === '/manifest.json') {
    const mfPath = fs.existsSync(path.join(PUBLIC_DIR, 'manifest.json'))
      ? path.join(PUBLIC_DIR, 'manifest.json')
      : path.join(__dirname, 'manifest.json');
    if (fs.existsSync(mfPath)) {
      res.writeHead(200, { 'Content-Type': 'application/manifest+json; charset=utf-8' });
      const stream = fs.createReadStream(mfPath);
      stream.on('error', () => res.end());
      return stream.pipe(res);
    }
  }

  // 3. Static files in public
  let filePath = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => res.end());
    return stream.pipe(res);
  }

  // 4. SPA Fallback: Always return index.html (eliminates all 404 Page Not Found errors)
  const indexHtml = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    const stream = fs.createReadStream(indexHtml);
    stream.on('error', () => res.end());
    return stream.pipe(res);
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><html><body><h1>PANU Studio</h1></body></html>');
});

server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[PANU Server] Écoute sur le port ${PORT}`);
});
