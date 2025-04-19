import { join } from "path";
import chalk from "chalk";

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
        console.debug(chalk.green(`Loaded data at ${filepath}`));
        return parsed;
    } catch (error) {
        console.warn(chalk.yellow(`Could not load file at ${filepath}, using default values.`));
    }
    return defaults
}