async function start() {
 const config = require('./config');
 const db = require('./db');
 const app = require('./app');
 try {
  await db.query('SELECT 1');
  const server = app.listen(config.port, config.host, () =>
   console.log(`API ready on ${config.host}:${config.port}`));
  server.on('error', async error => {
   console.error('Server startup failed.');
   await db.end(); process.exitCode = 1;
  });
  const stop = () => server.close(async () => { await db.end(); process.exit(0); });
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
 } catch (error) {
  await db.end();
  throw error;
 }
}
start().catch(error => {
 const safeConfigurationError = /^(Missing required configuration: [A-Z_]+\.(?: See \.env\.example\.)?|Invalid [A-Z_]+\.|JWT_SECRET must contain at least 32 characters\.)$/;
 console.error('Startup failed:', safeConfigurationError.test(error.message) ? error.message : 'Check server configuration and database availability.');
 process.exitCode = 1;
});
