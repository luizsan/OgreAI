const fs = require("fs")
const sharp = require("sharp")
const PNGtext = require('png-chunk-text');
const extract = require('png-chunks-extract');
const encode = require('png-chunks-encode');

class Character{
    constructor(){
        this.Reset();
    }

    static path = "./user/characters/"

    SetFrom(json){
        // tavern backwards compatibility
        if( json.first_mes ) this.greeting = json.first_mes
        if( json.mes_example ) this.dialogue = json.dialogue

        // common overrides
        if( json.name ) this.name = json.name;
        if( json.description ) this.description = json.description;
        if( json.greeting ) this.greeting = json.greeting;
        if( json.personality ) this.personality = json.personality;
        if( json.scenario ) this.scenario = json.scenario;
        if( json.dialogue ) this.dialogue = json.dialogue;
        if( json.author ) this.author = json.author;
        if( json.create_date ) this.create_date = json.create_date;
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

        this.metadata = {
            filepath: null,
            avatar: null,
            menuItem: null,
        }
    }

    static LoadFromDirectory( directory_path ){
        var list = [];
        let target = path.join( directory_path )
        if( !fs.existsSync(target) ){
            fs.mkdirSync(target, { recursive: true })
        }

        let files = fs.readdirSync(target)
    
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
    
        console.debug(`Loaded ${list.length} characters from directory ${target}`)
        return list;
    }

    static ReadFromFile( filepath ){
        sharp.cache(false);
        const _buffer = fs.readFileSync( filepath );
        const _chunks = extract(_buffer);
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
                console.warn( `${filepath} is not valid JSON!` );
            }else{
                console.warn( `An error occurred while reading character at ${filepath}\n`, error );
            }
            return null;
        }
    }

    async WriteToFile( image, filepath ){
        try {
            sharp.cache(false);
            let _buffer = fs.readFileSync(image)
            let _image = await sharp(_buffer).toFormat('png').toBuffer();
            let _chunks = extract(_image);
            let _tEXtChunks = _chunks.filter(c => c.name === 'tEXt');
            for (let c of _tEXtChunks) {
                _chunks.splice(_chunks.indexOf(c), 1);
            }
            
            let _data = JSON.stringify(this, function(key, value){ 
                return key != "metadata" ? value : undefined;
            });
            
            var _base64 = Buffer.from(_data, 'utf8').toString('base64');
            _chunks.splice(-1, 0, PNGtext.encode("character", _base64));
            fs.writeFileSync( filepath, new Buffer.from(encode(_chunks)));
            console.debug(`Successfully wrote character at ${ filepath }`)
        } catch (error) {
            console.warn(error);
        }
    }
}

exports.Character = Character