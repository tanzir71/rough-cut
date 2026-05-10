import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;
function configPath() {
    return path.join(app.getPath('userData'), 'config.json');
}
function readConfig() {
    try {
        const raw = fs.readFileSync(configPath(), 'utf-8');
        const parsed = JSON.parse(raw);
        return { llmMode: parsed.llmMode || 'LOCAL_ONLY', openrouterApiKey: parsed.openrouterApiKey };
    }
    catch {
        return { llmMode: 'LOCAL_ONLY' };
    }
}
function writeConfig(cfg) {
    fs.mkdirSync(path.dirname(configPath()), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf-8');
}
function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        backgroundColor: '#0B0F14',
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    if (isDev) {
        const url = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
        void win.loadURL(url);
        win.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        void win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}
ipcMain.handle('dialog:openDirectory', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    if (res.canceled)
        return null;
    return res.filePaths[0] || null;
});
ipcMain.handle('dialog:openFiles', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });
    if (res.canceled)
        return [];
    return res.filePaths;
});
ipcMain.handle('config:get', async () => {
    return readConfig();
});
ipcMain.handle('config:set', async (_evt, next) => {
    const merged = {
        llmMode: next.llmMode || 'LOCAL_ONLY',
        openrouterApiKey: next.openrouterApiKey || undefined,
    };
    writeConfig(merged);
    return merged;
});
app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit();
});
