const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require("path")

let window = null;

const createWindow = () => {
    window = new BrowserWindow({
        width: 1280,
        height: 720,
        center: true,
        fullscreen: false,
        autoHideMenuBar: true,
        backgroundColor: "#000000",
        // show: false,
        webPreferences: {
            spellcheck: false,
            nodeIntegration: true,
            contextIsolation: false,
        }
    })

    ipcMain.handle('get_paths', () => {
        return {
            is_packaged: app.isPackaged,
            app_path: app.getAppPath(),
            exe_path: app.getPath("exe")
        }
    })
    
    window.loadFile('index.html')
    window.once('ready-to-show', () => {})
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
    let result = dialog.showMessageBoxSync(arg.options);
    if( arg.event ){
        window.webContents.send( arg.event, result )
    }
})

ipcMain.on("show_error", (_event, arg) => {
    dialog.showErrorBox(arg.title, arg.message);
})

ipcMain.on("open_file", (_event, arg) => {
    let result = dialog.showOpenDialogSync(arg.options)
    window.webContents.send( arg.event, result )
});