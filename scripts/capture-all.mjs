import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9222;
const USER_DATA_DIR = '/tmp/chrome-cdp-profile-' + Date.now();
const SCREENSHOT_DIR = '/Users/ajkassime/Desktop/traceagro-v3/docs/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function main() {
  console.log('🚀 Spawning headless Google Chrome on port', DEBUG_PORT);
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    `--user-data-dir=${USER_DATA_DIR}`,
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:4173/login'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  console.log('📡 Fetching target list from /json/list...');
  const targetsRes = await fetch(`http://localhost:${DEBUG_PORT}/json/list`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find(t => t.type === 'page');

  if (!pageTarget) {
    throw new Error('No page target found in Chrome!');
  }

  console.log('Connected to Page CDP at:', pageTarget.webSocketDebuggerUrl);
  const ws = new globalThis.WebSocket(pageTarget.webSocketDebuggerUrl);

  let messageId = 0;
  const pendingRequests = new Map();

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++messageId;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((resolve) => {
    ws.onopen = () => {
      console.log('✅ WebSocket connection open.');
      resolve();
    };
  });

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      resolve(msg.result);
    }
  };

  await sendCommand('Page.enable');

  const authState = {
    state: {
      user: {
        id: 'user-admin-1',
        email: 'admin@traceagro.mg',
        firstName: 'Andry',
        lastName: 'Rabe',
        role: 'admin'
      },
      token: 'mock-valid-jwt-token-apl',
      refreshToken: 'mock-refresh-token',
      isAuthenticated: true,
      theme: 'light',
      language: 'fr'
    },
    version: 0
  };

  const screens = [
    { name: 'login', path: '/login', requiresAuth: false },
    { name: 'dashboard', path: '/dashboard', requiresAuth: true },
    { name: 'lots', path: '/lots', requiresAuth: true },
    { name: 'lot-detail', path: '/lots/lot-1', requiresAuth: true },
    { name: 'shipments', path: '/shipments', requiresAuth: true },
    { name: 'shipment-detail', path: '/shipments/ship-1', requiresAuth: true },
    { name: 'producers', path: '/producers', requiresAuth: true },
    { name: 'map', path: '/map', requiresAuth: true },
    { name: 'lot-public', path: '/lot-public/lot-1', requiresAuth: false },
    { name: 'shipment-public', path: '/shipment-public/ship-1', requiresAuth: false },
  ];

  const viewports = [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'tablet', width: 768, height: 1024 },
    { label: 'mobile', width: 375, height: 812 },
  ];

  for (const screen of screens) {
    for (const vp of viewports) {
      const filename = `${screen.name}-${vp.label}.png`;
      const fullPath = path.join(SCREENSHOT_DIR, filename);

      console.log(`📸 Capturing ${filename} (${vp.width}x${vp.height}) -> ${screen.path}`);

      await sendCommand('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.label === 'mobile',
      });

      if (!screen.requiresAuth && screen.name === 'login') {
        await sendCommand('Runtime.evaluate', {
          expression: `localStorage.removeItem('traceagro-auth');`
        });
      } else {
        await sendCommand('Runtime.evaluate', {
          expression: `localStorage.setItem('traceagro-auth', JSON.stringify(${JSON.stringify(authState)}));`
        });
      }

      await sendCommand('Page.navigate', { url: `http://localhost:4173${screen.path}` });
      await new Promise(r => setTimeout(r, 2200));

      const screenshotRes = await sendCommand('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false
      });

      if (screenshotRes && screenshotRes.data) {
        fs.writeFileSync(fullPath, Buffer.from(screenshotRes.data, 'base64'));
        console.log(`   ✓ Saved ${filename} (${fs.statSync(fullPath).size} bytes)`);
      } else {
        console.error(`   ✗ Failed to capture ${filename}`, screenshotRes);
      }
    }
  }

  console.log('🎉 All responsive screenshots captured successfully!');
  ws.close();
  chromeProcess.kill();
  process.exit(0);
}

main().catch(err => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
