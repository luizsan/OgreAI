import chalk from "chalk";
import { Database } from "bun:sqlite";
import { SCHEMA } from "../sql/schema.ts"
import { path_dir } from "./config.ts"

export const db = CreateDatabase();

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
    create_date?: number;
    participant: number;
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

export interface IDatabaseProfile{
    id: number;
    title: string;
    avatar: string;
    persona: string;
    customization: string;
    metadata?: string;
}

export interface IDatabaseCredentials{
    id: number;
    api_mode: string;
    title: string;
    endpoint: string;
    key: string;
}

export interface IDatabaseLorebook{
    id: string;
    content: string;
    toggled: boolean;
    metadata?: string;
}

export interface IDatabaseSettings{
    api_mode: string;
    main: string;
    prompt: string;
    formatting: string;
    metadata?: string;
}

function CreateDatabase(): Database{
    try{
        const database = new Database(path_dir.database, { create: true });
        database.exec(SCHEMA)
        console.log(chalk.green("⚙️  Database initialized"));
        return database
    }catch(error){
        console.error(chalk.red(`❌ Database initialization failed: ${error}`))
    }
    return null;
}

export default { db }