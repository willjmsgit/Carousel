const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');

let lastExportDir = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1100,
    minHeight: 640,
    backgroundColor: '#1b1a18',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // A stray file drop must never navigate the window away from the app.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

// Writes into a new timestamped subfolder, and never overwrites (flag 'wx'), so nothing existing is touched.
ipcMain.handle('save-files', async (_event, files) => {
  if (!Array.isArray(files) || !files.length) return null;
  const res = await dialog.showOpenDialog({
    title: 'Choose where to create the export folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(res.filePaths[0], `ig-export-${stamp}`);
  await fs.mkdir(dir, { recursive: true });
  for (const f of files) {
    const name = path.basename(String(f.name || ''));
    if (!name) continue;
    await fs.writeFile(path.join(dir, name), Buffer.from(f.bytes), { flag: 'wx' });
  }
  lastExportDir = dir;
  return dir;
});

// Only ever opens the folder created by the last export, never a path from the renderer.
ipcMain.handle('reveal-export', () => (lastExportDir ? shell.openPath(lastExportDir) : null));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
