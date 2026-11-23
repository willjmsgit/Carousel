const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    backgroundColor: '#121212',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

// Writes into a new timestamped subfolder so nothing existing is ever overwritten.
ipcMain.handle('save-files', async (_event, files) => {
  const res = await dialog.showOpenDialog({
    title: 'Choose where to create the export folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(res.filePaths[0], `ig-export-${stamp}`);
  await fs.mkdir(dir, { recursive: true });
  for (const f of files) {
    await fs.writeFile(path.join(dir, path.basename(f.name)), Buffer.from(f.bytes));
  }
  return dir;
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
