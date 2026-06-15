import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.DEPLOY_ENV !== 'PROD';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '5000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

process.on('uncaughtException', (err) => {
  console.error('FATAL: uncaughtException', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('FATAL: unhandledRejection', reason);
  process.exit(1);
});

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });
  server.once('error', err => {
    console.error('Server error', err);
    process.exit(1);
  });
  server.listen(port, hostname, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.DEPLOY_ENV
      }`,
    );
  });
}).catch((err) => {
  console.error('FATAL: failed to start server', err);
  process.exit(1);
});