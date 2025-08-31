import fs from "fs";
import path from "path";
import chalk from "chalk";
import { Database, Statement } from "bun:sqlite";
import { path_dir } from "./config.ts"

export const db = CreateDatabase();
export const op = LoadOperations();


export interface IDatabaseChat{
    id: number;
    title?: string;
    character_id: string;
    create_date: number;
    last_interaction: number;
    metadata?: string;
}

export interface IDatabaseMessage{
    id: number;
    chat_id: number;
    participant: number;
    parent_id?: number;
    candidate: number;
    metadata?: number;
}

export interface IDatabaseCandidate{
    id: number;
    message_id: number;
    text_content: string;
    text_reasoning: string;
    create_date: number;
    model?: string;
    timer: number;
    tokens?: string;
    metadata?: string;
}

function CreateDatabase(): Database{
    try{
        const database = new Database(path_dir.database, { create: true });
        const file = path.join(".", "sql", "database_init.sql");
        const schema = fs.readFileSync(file, "utf-8");
        database.exec(schema);
        console.log(chalk.green("⚙️  Database initialized"));
        return database
    }catch(error){
        console.error(chalk.red(`❌ Database initialization failed: ${error}`))
    }
    return null;
}

function LoadOperations(): Record<string, Statement>{
    if( !db ){
        throw new Error("Database must be initialized before loading operations");
    }
    const operations = {};
    const dir = path.join(".", "sql");
    const files = fs.readdirSync(dir);
    for(const file of files){
        try{
            if(!file.endsWith(".sql"))
                continue;
            let filepath = path.join(dir, file);
            let content = fs.readFileSync(filepath, "utf-8");
            let filename = path.parse(file).name;
            operations[filename] = db.prepare(content);
        }catch(error){
            console.error(chalk.red(`❌ Failed to load database operation ${file}:\n${error}`));
        }
    }
    return operations;
}

export default { db, op }