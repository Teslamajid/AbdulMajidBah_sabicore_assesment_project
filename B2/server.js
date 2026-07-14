import app from './src/app.js';
import { log } from './src/lib/logger.js';

const PORT = parseInt(process.env.PORT, 10) || 3001;

app.listen(PORT, () => {
  log('server_listening', { port: PORT, url: `http://localhost:${PORT}` });
});
