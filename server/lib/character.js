import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path"
import sharp from "sharp";
import chalk from "chalk";
import PNGtext from 'png-chunk-text';
import PNGextract from 'png-chunks-extract';
import PNGencode from 'png-chunks-encode';

import { decodeTimestamp as decodeTimestampTavern } from "../import/tavern.js"

class Character{
    static path = "../user/characters/"
    
    constructor(){
        this.Reset();
    }

    SetFrom(json){
        // tavern backwards compatibility (yuck)
        if( json.first_mes ){ this.greeting = json.first_mes }
        if( json.mes_example ){ this.dialogue = json.mes_example }

        // zoltanai
        if( json.metadata && json.metadata.created && json.metadata.modified ){
            this.create_date = json.metadata.created
            this.last_changed = json.metadata.modified
            
        // tavern
        }else if( json.created ){
            this.create_date = json.created

        // standard
        }else if( json.create_date ){
            this.create_date = json.create_date
        }

        // not unix time, but some other bullshit format
        if(typeof( this.create_date ) === "string"){
            if( this.create_date.indexOf("@") > -1 ){
                this.create_date = decodeTimestampTavern(this.create_date)
            }
        }else{
            this.create_date = new Date(this.create_date).getTime()
        }

        // common overrides
        if( json.name ){ this.name = json.name; }
        if( json.description ){ this.description = json.description; }
        if( json.greeting ){ this.greeting = json.greeting; }
        if( json.personality ){ this.personality = json.personality; }
        if( json.scenario ){ this.scenario = json.scenario; }
        if( json.dialogue ){ this.dialogue = json.dialogue; }
        if( json.author ){ this.author = json.author; }
        if( json.last_changed ){ this.last_changed = parseInt(json.last_changed); }
        
        // ensure the timestamp has the correct number of digits
        this.create_date = parseInt(this.create_date);
        if( this.create_date.toString().length < 13 ){
            this.create_date *= 10 ** ( 13 - this.create_date.toString().length )
        }
    }

    Reset(){
        this.name = ""
        this.description = ""
        this.greeting = ""
        this.personality = ""
        this.scenario = ""
        this.dialogue = ""
        this.author = ""
        this.create_date = Date.now()
        this.last_changed = Date.now()

        this.metadata = {
            filepath: null,
            avatar: null,
        }
    }

    static LoadFromDirectory( directory_path ){
        var list = [];
        let target = path.join( directory_path )
        if( !existsSync(target) ){
            mkdirSync(target, { recursive: true })
        }

        let files = readdirSync(target)
    
        for(let i = 0; i < files.length; i++){
            if(!files[i].toLowerCase().endsWith('.png')){
                continue;
            }   
    
            let filepath = path.join(target, files[i])
            let char = Character.ReadFromFile( filepath )
            if( char ){
                list.push( char )
            }
        }
    
        console.debug( chalk.green( `Loaded ${chalk.bold(list.length)} characters from directory ${target}` ))
        return list;
    }

    static ReadFromFile( filepath ){
        sharp.cache(false);
        const _buffer = readFileSync( filepath );
        const _chunks = PNGextract(_buffer);
        const _tEXtChunks = _chunks.filter(function (chunk) {
            return chunk.name === 'tEXt';
        }).map(function (chunk) {
            return PNGtext.decode(chunk.data);
        });
    
        try {
            let _base64 = Buffer.from(_tEXtChunks[0].text, 'base64').toString('utf8');
            let _json = JSON.parse(_base64);
            let _char = new Character();
            _char.SetFrom( _json )
            _char.metadata.filepath = filepath.replaceAll("\\", "/");
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
            sharp.cache(false);
            if( !buffer ){
                buffer = readFileSync( filepath )
            }

            let _image = await sharp(buffer).toFormat('png').toBuffer();
            let _chunks = PNGextract(_image);
            let _tEXtChunks = _chunks.filter(c => c.name === 'tEXt');
            for (let c of _tEXtChunks) {
                _chunks.splice(_chunks.indexOf(c), 1);
            }
            
            let _data = JSON.stringify(character, function(key, value){ 
                return key != "metadata" ? value : undefined;
            });
            
            var _base64 = Buffer.from(_data, 'utf8').toString('base64');
            _chunks.splice(-1, 0, PNGtext.encode("character", _base64));
            writeFileSync( filepath, new Buffer.from(PNGencode(_chunks)));
            console.debug( chalk.green( `Successfully wrote character at ${ filepath }` ))
            return true;
        } catch (error) {
            console.warn(error);
            return false;
        }
    }
}

const _Character = Character;
export { _Character as Character };