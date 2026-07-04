# 五子棋双窗口对战

一个支持双人在线对战的五子棋 Web 应用，包含 Node.js WebSocket 后端与原生 Canvas 前端。

## 功能特性

- 🎮 双人在线实时对战
- ⚫⚪ 黑白棋自动分配、轮流落子
- 🏆 自动判定五连胜利、认输、和棋
- 🔄 断线后剩余玩家自动判胜
- ✅ 后端与前端的单元测试覆盖

## 技术栈

- 后端：Node.js + `ws` + 原生 `http`
- 前端：原生 HTML5 Canvas + WebSocket
- 测试：Node.js 内置 Test Runner

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动服务

```bash
npm start
```

服务默认监听 `3000` 端口，打开浏览器访问 `http://localhost:3000`。

### 运行测试

```bash
npm test
```

## 项目结构

```
.
├── public/                 # 前端静态资源
│   ├── index.html          # 页面
│   ├── style.css           # 样式
│   ├── app.js              # 前端交互逻辑
│   └── game-logic.js       # 前端可测试纯逻辑
├── src/                    # 服务端源码
│   ├── server.js           # HTTP + WebSocket 服务器
│   ├── game.js             # 五子棋核心规则
│   ├── roomManager.js      # 房间与玩家管理
│   └── broadcast.js        # 消息广播工具
├── test/                   # 测试用例
│   ├── game.test.js
│   ├── game-logic.test.js
│   ├── roomManager.test.js
│   ├── broadcast.test.js
│   └── server.test.js
└── package.json
```

## 主要修复记录

- 修复静态文件路径穿越漏洞
- 新增 `.gitignore` 并移除已跟踪的 `node_modules`
- 修复断线消息语义，区分对局中 / 等待中 / 已结束
- 复用 `broadcast.buildGameState`，消除重复逻辑
- 重连时更新用户名
- WebSocket 协议根据页面协议自动选择 `ws` / `wss`
- 测试目录从 `public/tests/` 迁移到 `test/`，避免静态暴露

## License

ISC
