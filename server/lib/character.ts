import * as fs from "fs";
import path from "path";
import chalk from "chalk";
import PNGtext from 'png-chunk-text';
import PNGextract from 'png-chunks-extract';
import PNGencode from 'png-chunks-encode';
import * as Tavern from "../external/tavern.ts";
import { ICharacter } from "../../shared/types.js";


export function Create() : ICharacter {
    return {
        spec: "chara_card_v2",
        spec_version: "2.0",
        data: {
            name: "New character",
            author: "",
            description: "",
            personality: "",
            scenario: "",
            first_mes: "",
            mes_example: "",
            creator_notes: "",
            creator: "",
            character_version: "",
            system_prompt: "",
            post_history_instructions: "",
            alternate_greetings: [],
            tags: [],
            character_book: undefined,
            extensions: {},
        },
        metadata: {
            created: Date.now(),
            modified: Date.now(),
            version: 1,
            source: null,
            tool: {
                name: "OgreAI",
                version: "2.0.0",
                url: "https://github.com/luizsan/OgreAI"
            }
        },
        temp: {
            filename: "",
            filepath: "",
            avatar: ""
        },
    }
}

export function parseCharacterV1(json: any): ICharacter {
    const character: ICharacter = Create()
    character.spec = "chara_card_v1"
    character.spec_version = "1.0"
    character.data.name = json.name ?? ""
    character.data.description = json.description ?? ""
    character.data.personality = json.personality ?? ""
    character.data.scenario = json.scenario ?? ""
    character.data.first_mes = json.greeting ?? json.first_mes ?? ""
    character.data.mes_example = json.dialogue ?? json.mes_example ?? ""
    character.data.author = json.author ?? ""
    character.data.creator = json.author ?? ""
    return character
}

export function sanitizeMetadata(character: ICharacter, json: any): void {
    const created = json.metadata?.created ?? json.created ?? json.create_date ?? character.temp.filecreated ?? Date.now();
    const modified = json.metadata?.modified ?? json.last_changed ?? created;
    character.metadata.created = typeof created === "string" && created.includes("@") ? Tavern.decodeTimestamp(created) : parseInt(created, 10);
    character.metadata.modified = parseInt(modified, 10);
}

export function sanitizeTimestamp(character: ICharacter): void {
    const adjustSize = (timestamp: number): number => {
        const size = timestamp.toString().length;
        return size < 13 ? timestamp * Math.pow(10, 13 - size) : timestamp;
    };
    character.metadata.created = adjustSize(character.metadata.created);
    character.metadata.modified = adjustSize(character.metadata.modified);
}

export function LoadFromDirectory(dir: string): ICharacter[] {
    const list: ICharacter[] = [];
    const target = path.join(dir).replace(/\\/g, "/");
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }

    const exploreDirectory = (currentPath: string): void => {
        const entries = fs.readdirSync(currentPath);
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry);
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                exploreDirectory(fullPath);
            } else if (stats.isFile() && fullPath.toLowerCase().endsWith('.png')) {
                const char: ICharacter = ReadFromFile(fullPath);
                if (char) {
                    const relative_path = path.relative(dir, fullPath).replaceAll("\\", "/");
                    char.temp.filepath = relative_path
                    char.temp.filename = path.parse(relative_path).name
                    list.push(char);
                }
            }
        }
    };

    exploreDirectory(target);
    console.debug(chalk.green(`Loaded ${chalk.bold(list.length)} characters from directory ${target}`));
    return list;
}

export function ReadFromFile(filepath: string): ICharacter | null {
    filepath = filepath.replace(/\\/g, "/");
    try {
        const stats = fs.statSync(filepath);
        const buffer = fs.readFileSync(filepath);
        const chunks = PNGextract(buffer);
        const tEXtChunks = chunks.filter(chunk => chunk.name === 'tEXt').map(chunk => PNGtext.decode(chunk.data));
        const base64 = Buffer.from(tEXtChunks[0].text, 'base64').toString('utf8');
        const json: any = JSON.parse(base64);

        let character: ICharacter = Create()
        if (!json.spec || !json.data) {
            character = parseCharacterV1(json);
        }else{
            character = json;
        }

        if (character) {
            character.metadata = character.metadata ?? {}
            character.temp = character.temp ?? { filepath: "", filename: "", avatar: "" }
            character.temp.filepath = filepath
            character.temp.filename = path.parse(filepath).name
            character.temp.filecreated = stats.ctimeMs
            character.temp.filemodified = stats.mtimeMs
            if( character.temp.filecreated > character.temp.filemodified ){
                character.temp.filecreated = character.temp.filemodified
            }
            sanitizeMetadata(character, json);
            sanitizeTimestamp(character);
            return character
        }

    } catch (error) {
        console.warn(chalk.yellow(`${filepath} is not valid JSON!`));
        console.error(chalk.red(error));
    }
    return null;
}

export async function WriteToFile(character: ICharacter, filepath: string, buffer: Buffer | null): Promise<boolean> {
    try {
        if (!buffer) {
            buffer = fs.readFileSync(filepath);
        }

        const chunks = PNGextract(buffer);
        const tEXtChunks = chunks.filter(c => c.name === 'tEXt');
        tEXtChunks.forEach(c => chunks.splice(chunks.indexOf(c), 1));

        const data = JSON.stringify(character, (key, value) => key !== "temp" ? value : undefined);
        const base64 = Buffer.from(data, 'utf8').toString('base64');
        chunks.splice(-1, 0, PNGtext.encode("chara", base64));
        fs.writeFileSync(filepath, PNGencode(chunks));
        console.debug(chalk.green(`Successfully wrote character at ${filepath}`));
        return true;
    } catch (error) {
        console.warn(error);
        return false;
    }
}
