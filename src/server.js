import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = join(process.cwd(), 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// HTTP 静态文件服务
const server = createServer(async (req, res) => {
  let pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (pathname === '/') pathname = '/index.html';

  const filePath = join(PUBLIC_DIR, pathname);
  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

// WebSocket 服务
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('新客户端已连接');

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('收到消息:', message);
    // TODO: 处理 join / move / resign 事件
  });

  ws.on('close', () => {
    console.log('客户端已断开');
  });
});

server.listen(PORT, () => {
  console.log(`五子棋服务端已启动，端口: ${PORT}`);
});
