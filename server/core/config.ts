import fs from "fs";
import path from "path";
import { join } from "path";
import chalk from "chalk";


const __dirname: string = path.resolve("./")

export const server: IServerConfig = await InitializeConfig()
export const userPath: string = path.join(__dirname, server.paths.user, "/").replace(/\\/g, '/');
export const imgPath: string = path.join(__dirname, './img/').replace(/\\/g, '/');
export const htmlPath: string = path.join(__dirname, './html/').replace(/\\/g, '/');

export const path_dir: Record<string, string> = {
    user: path.join(userPath, "/").replace(/\\/g, '/'),
    avatar: path.join(userPath, "/avatar/").replace(/\\/g, '/'),
    characters: path.join(userPath, "/characters/").replace(/\\/g, '/'),
    chats: path.join(userPath, "/chats/").replace(/\\/g, '/'),
    lorebooks: path.join(userPath, "/lorebooks/").replace(/\\/g, '/'),
    presets: path.join(userPath, "/presets/").replace(/\\/g, '/'),
    settings: path.join(userPath, "/settings/").replace(/\\/g, '/'),
    database: path.join(userPath, "/database.db").replace(/\\/g, '/')
}

export interface IServerConfig{
    port: number
    paths: {
        user: string
    }
}

export async function InitializeConfig(): Promise<IServerConfig>{
    let config: IServerConfig = {
        port: 12480,
        paths: {
            user: "../user",
        }
    }
    // check if config file exists at root folder
    if (fs.existsSync("./config.json")){
        config = await LoadData("./config.json", config)
    }else{
        await SaveData("./config.json", config)
    }
    if( !fs.existsSync(config.paths?.user ?? "./user") ){
        fs.mkdirSync(config.paths?.user ?? "./user", { recursive: true });
    }
    return config
}

export async function SaveData(filepath: string, content: any): Promise<boolean> {
    try {
        filepath = join(filepath).replaceAll("\\", "/");
        await Bun.write(filepath, JSON.stringify(content, null, 2));
        console.debug(chalk.green(`Saved file at ${filepath}`));
        return true
    } catch (error) {
        console.error(chalk.red("Could not save data\n" + error));
    }
    return false
}

export async function LoadData(filepath: string, defaults: any = {}): Promise<any> {
    try {
        filepath = join(filepath).replaceAll("\\", "/");
        const file = Bun.file(filepath);
        const content = await file.text();
        const parsed = JSON.parse(content);
        console.debug(chalk.green(`⚙️  Server configs initialized`));
        return parsed;
    } catch (error) {
        console.warn(chalk.yellow(`⚙️  Could not load server config file, using default values.`));
    }
    return defaults
}