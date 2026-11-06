import express from 'express';
import http from 'node:http';
import { spawn, spawnSync, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PYTHON_PORT = 5050;
let pythonProcess: ChildProcess | null = null;

function findPythonBinary(): string {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;

  const isWin = process.platform === 'win32';
  // On Windows, 'python' or 'py' is standard; on Linux/macOS, 'python3' is standard
  const candidates = isWin ? ['python', 'py', 'python3'] : ['python3', 'python'];

  for (const cmd of candidates) {
    try {
      const res = spawnSync(cmd, ['-c', 'import sys; print(sys.version_info[0])'], {
        encoding: 'utf-8',
        shell: isWin,
        timeout: 2000,
      });
      if (res.status === 0 && res.stdout && res.stdout.trim() === '3') {
        return cmd;
      }
    } catch {
      // Continue to next candidate
    }
  }

  return isWin ? 'python' : 'python3';
}

function ensurePythonBackend(): Promise<void> {
  return new Promise((resolve) => {
    // Check if python backend is already responding
    const req = http.get(`http://127.0.0.1:${PYTHON_PORT}/api/health`, (res) => {
      if (res.statusCode === 200) {
        console.log('[Server] Python backend is already running on port', PYTHON_PORT);
        resolve();
      } else {
        startProcess(resolve);
      }
    });

    req.on('error', () => {
      startProcess(resolve);
    });

    req.setTimeout(1000, () => {
      req.destroy();
      startProcess(resolve);
    });

    function startProcess(onReady: () => void) {
      const pyCmd = findPythonBinary();
      console.log(`[Server] Spawning Python REST backend using '${pyCmd}' on port ${PYTHON_PORT}`);

      pythonProcess = spawn(pyCmd, ['backend/server.py', String(PYTHON_PORT)], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });

      pythonProcess.on('error', (err) => {
        console.error('[Server] Failed to spawn Python backend:', err.message);
        console.error('[Server] Make sure Python 3.10+ is installed and added to PATH (https://www.python.org/downloads/).');
      });

      pythonProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`[Server] Python backend process exited with code ${code}.`);
        }
      });

      // Poll until ready
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const checkReq = http.get(`http://127.0.0.1:${PYTHON_PORT}/api/health`, (res) => {
          if (res.statusCode === 200) {
            clearInterval(interval);
            console.log('[Server] Python backend confirmed online.');
            onReady();
          }
        });
        checkReq.on('error', () => {});
        if (attempts > 30) {
          clearInterval(interval);
          console.warn('[Server] Python backend check timed out; continuing anyway.');
          onReady();
        }
      }, 250);
    }
  });
}

async function startServer() {
  await ensurePythonBackend();

  const app = express();

  // Forward /api/* requests to Python backend
  app.use('/api', (req, res) => {
    const targetUrl = new URL(req.originalUrl, `http://127.0.0.1:${PYTHON_PORT}`);
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: PYTHON_PORT,
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: `127.0.0.1:${PYTHON_PORT}`,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('[Proxy Error]:', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Ошибка соединения с Python сервером', details: err.message });
      }
    });

    req.pipe(proxyReq);
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Task-Planer App running at http://0.0.0.0:${PORT}`);
  });
}

process.on('SIGINT', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit(0);
});

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
