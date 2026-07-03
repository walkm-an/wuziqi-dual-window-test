// TODO: 实现五子棋客户端逻辑（WebSocket 连接、事件处理、棋盘渲染）

const ws = new WebSocket(`ws://${location.host}`);

ws.addEventListener('open', () => {
  console.log('已连接服务端');
});

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  console.log('收到服务端消息:', message);
});

ws.addEventListener('close', () => {
  console.log('连接已关闭');
});
