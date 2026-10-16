#!/usr/bin/env node
// Local-only admin for the photo portfolio.
//
//   node photo/_admin/server.js        then open http://localhost:4321/admin/
//
// Edits photo/index.html and writes uploads into photo/photography/. Commit and
// push afterwards to publish. The leading underscore keeps this folder out of the
// GitHub Pages (Jekyll) build.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');

const PORT = Number(process.env.PORT) || 4321;
const ADMIN_DIR = __dirname;
const PHOTO_DIR = path.resolve(ADMIN_DIR, '..');
const SITE_ROOT = path.resolve(PHOTO_DIR, '..');
const INDEX_FILE = path.join(PHOTO_DIR, 'index.html');
const IMAGE_DIR = path.join(PHOTO_DIR, 'photography');
const IMAGE_PREFIX = 'photography/';
const MAX_EDGE = 2400;
const WEBP_QUALITY = 82;
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
const IMAGE_EXT = /\.(webp|jpe?g|png|gif|avif|heic|heif|tiff?)$/i;

const COLUMN_RE = /<div class="column">([\s\S]*?)<\/div>/g;
const ITEM_RE = /(<!--\s*)?<img\b[^>]*?data-src="([^"]+)"[^>]*>(\s*-->)?/g;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

const hash = (s) => crypto.createHash('sha1').update(s).digest('hex');

function parseLayout(html) {
  const columns = [];
  for (const [, body] of html.matchAll(COLUMN_RE)) {
    const items = [];
    for (const m of body.matchAll(ITEM_RE)) {
      items.push({ src: m[2], hidden: Boolean(m[1] && m[3]) });
    }
    columns.push(items);
  }
  return columns;
}

function renderColumn(items) {
  const lines = items.map(({ src, hidden }) => {
    const tag = `<img data-src="${src}" loading="lazy" class="lazyload" style="width:100%">`;
    return `      ${hidden ? `<!-- ${tag} -->` : tag}`;
  });
  return `<div class="column">\n${lines.join('\n')}\n    </div>`;
}

function listImageFiles() {
  return fs
    .readdirSync(IMAGE_DIR)
    .filter((f) => IMAGE_EXT.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function readLayout() {
  const html = fs.readFileSync(INDEX_FILE, 'utf8');
  const columns = parseLayout(html);
  const used = new Set(columns.flat().map((i) => i.src));
  const unused = listImageFiles()
    .map((f) => IMAGE_PREFIX + f)
    .filter((src) => !used.has(src));
  return { columns, unused, version: hash(html) };
}

function writeLayout({ columns, version }) {
  const html = fs.readFileSync(INDEX_FILE, 'utf8');
  if (version !== hash(html)) {
    throw httpError(409, 'index.html changed on disk since you loaded it. Reload the admin and try again.');
  }
  const existing = html.match(COLUMN_RE) || [];
  if (!Array.isArray(columns) || columns.length !== existing.length) {
    throw httpError(400, `Expected ${existing.length} columns.`);
  }
  for (const col of columns) {
    for (const item of col) {
      if (typeof item.src !== 'string' || !item.src.startsWith(IMAGE_PREFIX) || /["<>]/.test(item.src)) {
        throw httpError(400, `Invalid image path: ${item.src}`);
      }
    }
  }
  let i = 0;
  const next = html.replace(COLUMN_RE, () => renderColumn(columns[i++]));
  const tmp = INDEX_FILE + '.tmp';
  fs.writeFileSync(tmp, next);
  fs.renameSync(tmp, INDEX_FILE);
  return readLayout();
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (err) reject(new Error(`${cmd} failed: ${stderr || err.message}`));
      else resolve(stdout);
    });
  });
}

async function imageSize(file) {
  const out = await run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]);
  const w = Number(/pixelWidth:\s*(\d+)/.exec(out)?.[1]);
  const h = Number(/pixelHeight:\s*(\d+)/.exec(out)?.[1]);
  return { w, h };
}

function uniqueName(base) {
  const taken = new Set(fs.readdirSync(IMAGE_DIR).map((f) => f.toLowerCase()));
  let name = `${base}.webp`;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base}-${n}.webp`;
  return name;
}

async function saveUpload(originalName, desiredName, buffer) {
  const ext = path.extname(originalName).toLowerCase();
  if (!IMAGE_EXT.test(ext)) throw httpError(400, `Unsupported file type: ${ext || 'none'}`);

  const base =
    String(desiredName || path.basename(originalName, ext))
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^A-Za-z0-9_-]+/g, '')
      .slice(0, 80) || 'Photo';
  const fileName = uniqueName(base);
  const dest = path.join(IMAGE_DIR, fileName);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'photo-admin-'));
  try {
    let input = path.join(tmpDir, `in${ext}`);
    fs.writeFileSync(input, buffer);

    // cwebp can't read HEIC/AVIF/GIF; let sips turn those into a lossless TIFF first.
    if (!/\.(jpe?g|png|tiff?|webp)$/.test(ext)) {
      const tiff = path.join(tmpDir, 'in.tiff');
      await run('sips', ['-s', 'format', 'tiff', input, '--out', tiff]);
      input = tiff;
    }

    const { w, h } = await imageSize(input);
    const args = ['-q', String(WEBP_QUALITY), '-metadata', 'icc', '-mt'];
    if (Math.max(w, h) > MAX_EDGE) {
      args.push('-resize', ...(w >= h ? [String(MAX_EDGE), '0'] : ['0', String(MAX_EDGE)]));
    }
    await run('cwebp', [...args, input, '-o', dest]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  return { src: IMAGE_PREFIX + fileName };
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(httpError(413, 'File too large.'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function serveStatic(res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  let root = SITE_ROOT;
  if (rel === '/admin') rel = '/admin/';
  if (rel.startsWith('/admin/')) {
    root = ADMIN_DIR;
    rel = rel.slice('/admin'.length);
  }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(root, rel);
  if (!file.startsWith(root + path.sep) || rel.split('/').some((seg) => seg.startsWith('.'))) {
    return sendJson(res, 403, { error: 'Forbidden' });
  }

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    // Block DNS rebinding, and force a CORS preflight (which we never approve) on writes
    // so other sites open in the browser can't post here.
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw httpError(403, 'Forbidden host.');
    if (req.method === 'POST' && req.headers['x-photo-admin'] !== '1') throw httpError(403, 'Missing admin header.');

    if (url.pathname === '/api/layout' && req.method === 'GET') {
      return sendJson(res, 200, readLayout());
    }
    if (url.pathname === '/api/layout' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req, 1024 * 1024)).toString('utf8'));
      return sendJson(res, 200, writeLayout(body));
    }
    if (url.pathname === '/api/upload' && req.method === 'POST') {
      const buffer = await readBody(req, MAX_UPLOAD_BYTES);
      const result = await saveUpload(
        url.searchParams.get('filename') || 'upload.jpg',
        url.searchParams.get('name'),
        buffer,
      );
      return sendJson(res, 200, result);
    }
    if (req.method === 'GET') return serveStatic(res, url.pathname);
    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    sendJson(res, err.status || 500, { error: err.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Photo admin:   http://localhost:${PORT}/admin/`);
  console.log(`Live preview:  http://localhost:${PORT}/photo/`);
});
