import fs from "fs";
import path from "path";
import chalk from "chalk";
import { Database } from "bun:sqlite";

export const operations = {}

export function Initialize(path: string){
    return new Database(path, { create: true });
}

export function Create(db: Database){
    console.debug( "---")
    try{
        const file = path.join(".", "sql", "database_init.sql");
        const schema = fs.readFileSync(file, "utf-8");
        db.exec(schema);
        console.log(chalk.green("✅ Database initialized"));
    }catch(error){
        console.error(chalk.red(`❌ Database initialization failed: ${error}`))
    }
}

export function LoadOperations(db: Database){
    const dir = "../sql";
    const files = fs.readdirSync(dir);
    for(let i = 0; i < files.length; i++){
        let filepath = path.join(dir, files[i]);
        let content = fs.readFileSync(filepath, "utf-8");
        let filename = path.basename(filepath);
        operations[filename] = db.prepare(content);
    }
}