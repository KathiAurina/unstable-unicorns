const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy boardgame.io lobby API
  app.use(
    '/games',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
    })
  );

  // Proxy Socket.IO (boardgame.io real-time game, includes WebSocket upgrade)
  // Filter excludes /ws which is CRA's HMR WebSocket — don't proxy that
  app.use(
    createProxyMiddleware(
      (pathname) => pathname.startsWith('/socket.io'),
      {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      }
    )
  );
};
