const { createProxyMiddleware } = require('http-proxy-middleware');

const devProxyTarget = process.env.DEV_PROXY_TARGET || 'http://127.0.0.1:8000';

module.exports = function(app) {
  // Proxy boardgame.io lobby API
  app.use(
    '/games',
    createProxyMiddleware({
      target: devProxyTarget,
      changeOrigin: true,
    })
  );

  // Proxy Socket.IO (boardgame.io real-time game, includes WebSocket upgrade)
  // Filter excludes /ws which is CRA's HMR WebSocket — don't proxy that
  app.use(
    createProxyMiddleware(
      (pathname) => pathname.startsWith('/socket.io'),
      {
        target: devProxyTarget,
        changeOrigin: true,
        ws: true,
      }
    )
  );
};
