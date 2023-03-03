const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const createWindow = () => {
    const window = new BrowserWindow({
        width: 1280,
        height: 720,
        fullscreen: false,
        autoHideMenuBar: true,
        backgroundColor: "#000000",
        // show: false,
        webPreferences: {
            spellcheck: false,
            nodeIntegration: true,
            contextIsolation: false,
            // preload: path.join(__dirname, 'preload.js')
        }
    })
    
    window.loadFile('index.html')
    window.once('ready-to-show', () => { /**/ })
    window.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0){
        createWindow();
    }
})

app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin'){
        app.quit();
    } 
})

ipcMain.on("show_message", (_event, arg) => {
    dialog.showMessageBox(arg);
})

ipcMain.on("show_error", (_event, arg) => {
    dialog.showErrorBox(arg.title, arg.message);
})

ipcMain.on("import_character", (_event, _arg) => {
    console.log( dialog.showOpenDialogSync({ 
        filters: [{ name: '', extensions: ['json', 'png'] }],
        properties: ['openFile', 'dontAddToRecent', ] 
    }))
});
