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
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      ws: true,
    })
  );
};
