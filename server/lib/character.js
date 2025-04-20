import * as fs from "fs";
import path from "path"
import chalk from "chalk";
import PNGtext from 'png-chunk-text';
import PNGextract from 'png-chunks-extract';
import PNGencode from 'png-chunks-encode';

import * as Tavern from "../import/tavern.js"

export default class Character{
    static path = "../user/characters/"

    constructor(){
        this.Reset();
    }

    Reset(){
        this.spec = 'chara_card_v2',
        this.spec_version = '2.0',
        this.data = {
            name: "",
            description: "",
            personality: "",
            scenario: "",
            first_mes: "",
            mes_example: "",

            // v2
            creator_notes: "",
            system_prompt: "",
            post_history_instructions: "",
            alternate_greetings: [],
            character_book: undefined,
            tags: [],
            creator: "",
            character_version: "",
            extensions: {},
        }

        this.metadata = {
            created: Date.now(),
            modified: Date.now(),
            version: 1,
            source: null,
            tool: {
                name: "OgreAI",
                version: "1.0.0",
                url: "https://github.com/luizsan/OgreAI"
            }
        }

        this.temp = {
            filepath: null,
            avatar: null,
        }
    }

    Parse(json){
        if( !json.spec || !json.data ){
            // v1
            this.data.name = json.name ?? ""
            this.data.description = json.description ?? ""
            this.data.personality = json.personality ?? ""
            this.data.scenario = json.scenario ?? ""
            this.data.first_mes = json.greeting ?? json.first_mes ?? ""
            this.data.mes_example = json.dialogue ?? json.mes_example ?? ""

            this.data.creator_notes = ""
            this.data.creator = json.author ?? ""
            this.data.character_version = ""
            this.data.system_prompt = ""
            this.data.post_history_instructions = ""
            this.data.alternate_greetings = []
            this.data.tags = []
        }else{
            // v2
            this.data.name = json.name ?? json.data.name ?? ""
            this.data.description = json.description ?? json.data.description ?? ""
            this.data.personality = json.personality ?? json.data.personality ?? ""
            this.data.scenario = json.scenario ?? json.data.scenario ?? ""
            this.data.first_mes = json.greeting ?? json.data.first_mes ?? json.first_mes ?? ""
            this.data.mes_example = json.dialogue ?? json.data.mes_example ?? json.mes_example ?? ""

            this.data.creator_notes = json.data.creator_notes ?? ""
            this.data.creator = json.author ?? json.data.creator ?? ""
            this.data.character_version = json.data.character_version ?? ""
            this.data.system_prompt = json.data.system_prompt ?? ""
            this.data.post_history_instructions = json.data.post_history_instructions ?? ""
            this.data.alternate_greetings = json.data.alternate_greetings ?? []
            this.data.tags = json.data.tags ?? []

            // preserved fields (unused)
            this.data.extensions = json.data.extensions ?? {}
            this.data.character_book = json.data.character_book
        }

        // timestamps
        if( json.metadata && json.metadata.created && json.metadata.modified ){
            // zoltanai
            this.metadata.created = parseInt( json.metadata.created ?? this.temp.filecreated ?? Date.now() )
            this.metadata.modified = parseInt( json.metadata.modified ?? this.temp.filemodified ?? Date.now() )
        }else{
            let timestamp_created = json.created ?? json.create_date ?? this.temp.filecreated ?? Date.now()
            let timestamp_modified = json.last_changed ?? this.temp.filemodified ?? timestamp_created

            if(typeof( timestamp_created ) === "string"){
                // not unix time, but some other bullshit format
                if( timestamp_created.indexOf("@") > -1 ){
                    this.metadata.created = Tavern.decodeTimestamp( timestamp_created )
                }else{
                    this.metadata.created = parseInt( timestamp_created )
                }
                this.metadata.modified = timestamp_modified
            }else{
                this.metadata.created = parseInt( timestamp_created )
                this.metadata.modified = parseInt( json.last_changed ?? timestamp_modified )
            }
        }

        // ensure the timestamp has the correct number of digits
        let size_created = this.metadata.created.toString().length
        if( size_created < 13 ){
            this.metadata.created *= 10 ** ( 13 - size_created )
        }

        let size_modified = this.metadata.modified.toString().length
        if( size_modified < 13 ){
            this.metadata.modified *= 10 ** ( 13 - size_modified )
        }
    }



    static LoadFromDirectory( directory_path ){
        var list = [];
        let target = path.join( directory_path )
        if( !fs.existsSync(target) ){
            fs.mkdirSync(target, { recursive: true })
        }

        target = target.replaceAll("\\", "/")
        function ExploreDirectory( current_path ){
            const entries = fs.readdirSync( current_path )
            for (const entry of entries) {
                const full_path = path.join( current_path, entry);
                const stats = fs.statSync( full_path );
                if (stats.isDirectory()) {
                    ExploreDirectory( full_path );
                } else if (stats.isFile()) {
                    if(!full_path.toLowerCase().endsWith('.png')){
                        continue;
                    }
                    let char = Character.ReadFromFile( full_path )
                    if( char ){
                        list.push( char )
                    }
                }
            }
        }

        ExploreDirectory(target)
        console.debug( chalk.green( `Loaded ${chalk.bold(list.length)} characters from directory ${target}` ))
        return list;
    }

    static ReadFromFile( filepath ){
        filepath = filepath.replaceAll("\\", "/")
        try {
            const stats = fs.statSync( filepath );
            const _buffer = fs.readFileSync( filepath );
            const _chunks = PNGextract(_buffer);
            const _tEXtChunks = _chunks.filter(function (chunk) {
                return chunk.name === 'tEXt';
            }).map(function (chunk) {
                return PNGtext.decode(chunk.data);
            });

            let _base64 = Buffer.from(_tEXtChunks[0].text, 'base64').toString('utf8');
            let _json = JSON.parse(_base64);
            let _char = new Character();
            _char.temp.filecreated = parseInt( stats.ctimeMs )
            _char.temp.filemodified = parseInt( stats.mtimeMs )

            if( _char.temp.filecreated > _char.temp.filemodified ){
                _char.temp.filecreated = _char.temp.filemodified
            }

            _char.temp.filepath = filepath.replaceAll("\\", "/");
            _char.Parse( _json )
            return _char;

        }catch (error){
            if (error instanceof SyntaxError) {
                console.warn( chalk.yellow( `${filepath} is not valid JSON!` ));
            }else{
                console.warn( chalk.yellow( `Could not read character at ${filepath}` ));
                console.error( chalk.red( error ))
            }
            return null;
        }
    }

    static async WriteToFile( character, filepath, buffer ){
        try {
            if( !buffer ){
                buffer = fs.readFileSync( filepath )
            }

            let _chunks = PNGextract(buffer);
            let _tEXtChunks = _chunks.filter(c => c.name === 'tEXt');
            for (let c of _tEXtChunks) {
                _chunks.splice(_chunks.indexOf(c), 1);
            }

            let _data = JSON.stringify(character, function(key, value){
                return key != "temp" ? value : undefined;
            });

            var _base64 = Buffer.from(_data, 'utf8').toString('base64');
            _chunks.splice(-1, 0, PNGtext.encode("chara", _base64));
            fs.writeFileSync( filepath, new Buffer.from(PNGencode(_chunks)));
            console.debug( chalk.green( `Successfully wrote character at ${ filepath }` ))
            return true;
        } catch (error) {
            console.warn(error);
            return false;
        }
    }
}