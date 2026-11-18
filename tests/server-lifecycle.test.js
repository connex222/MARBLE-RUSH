/* Local HTTP + WebSocket lifecycle regression, no external services required. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { WebSocket } = require('ws');
const ROOT = path.resolve(__dirname, '..');

function startServer() {
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: ROOT, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((resolve, reject) => {
    let stdout = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(Error('server startup timed out: ' + stdout)); }, 7000);
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      const match = /Marble Rush running on port (\d+)/.exec(stdout);
      if (match) { clearTimeout(timer); resolve({ child, port: Number(match[1]) }); }
    });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('exit', code => { clearTimeout(timer); reject(Error('server exited before ready: ' + code + ': ' + stdout)); });
  });
}

function connect(port) {
  const socket = new WebSocket('ws://127.0.0.1:' + port + '/ws');
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.terminate(); reject(Error('WebSocket open timed out')); }, 4000);
    socket.once('open', () => { clearTimeout(timer); resolve(socket); });
    socket.once('error', error => { clearTimeout(timer); reject(error); });
  });
}

function nextMessage(socket, type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.removeListener('message', onMessage); reject(Error(type + ' not received')); }, 5000);
    function onMessage(data) {
      let message;
      try { message = JSON.parse(data.toString()); } catch { return; }
      if (message.t !== type) return;
      clearTimeout(timer); socket.removeListener('message', onMessage); resolve(message);
    }
    socket.on('message', onMessage);
  });
}

function closed(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('WebSocket did not close')), 7000);
    socket.once('close', (code) => { clearTimeout(timer); resolve(code); });
  });
}

function exited(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(Error('SIGTERM exceeded shutdown deadline')); }, 9900);
    child.once('exit', (code, signal) => { clearTimeout(timer); resolve({ code, signal }); });
  });
}

test('GET /health returns JSON and live room count', async t => {
  const { child, port } = await startServer();
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  const before = await fetch('http://127.0.0.1:' + port + '/health');
  assert.equal(before.status, 200);
  assert.match(before.headers.get('content-type'), /application\/json/);
  const h = await before.json();
  assert.equal(h.ok, true);
  assert.equal(h.rooms, 0);
  assert.equal(Number.isInteger(h.uptime), true);
  assert.ok(h.uptime >= 0);

  const tv = await connect(port);
  t.after(() => tv.terminate());
  const room = nextMessage(tv, 'room');
  tv.send(JSON.stringify({ t: 'host', code: null }));
  const got = await room;
  assert.match(got.code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
  const after = await (await fetch('http://127.0.0.1:' + port + '/health')).json();
  assert.equal(after.rooms, 1);
  const close = closed(tv);
  tv.close();
  await close;
  const exit = exited(child);
  child.kill('SIGTERM');
  assert.equal((await exit).code, 0);
});

test('SIGTERM sends restart notice and close code 1012 to TV and phone', async t => {
  const { child, port } = await startServer();
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  const tv = await connect(port);
  const hostMessage = nextMessage(tv, 'room');
  tv.send(JSON.stringify({ t: 'host', code: 'PARK' }));
  const { code } = await hostMessage;
  assert.equal(code, 'PARK', 'host must reclaim its saved QR code after a restart');
  const phone = await connect(port);
  const join = nextMessage(tv, 'join');
  phone.send(JSON.stringify({ t: 'join', code, pid: 'test-player', name: 'Tester', swirl: 1 }));
  assert.equal((await join).pid, 'test-player');
  const tvRestart = nextMessage(tv, 'restart');
  const phoneRestart = nextMessage(phone, 'restart');
  const tvClosed = closed(tv);
  const phoneClosed = closed(phone);
  const exit = exited(child);
  child.kill('SIGTERM');
  const [a, b, tvCode, phoneCode, ended] = await Promise.all([tvRestart, phoneRestart, tvClosed, phoneClosed, exit]);
  assert.match(a.message, /restarting/i);
  assert.match(b.message, /restarting/i);
  assert.equal(tvCode, 1012);
  assert.equal(phoneCode, 1012);
  assert.equal(ended.code, 0);
});
