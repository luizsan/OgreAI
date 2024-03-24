import fs from "fs";
import path from "path"
import chalk from "chalk";

export default class Lorebook{
    static path = "../user/lorebooks/"

    constructor( name = ""){
        this.name = name
        this.description = ""
        this.scan_depth = 5
        this.token_budget = 100
        this.recursive_scanning = false
        this.entries = []
        this.extensions = {}
    }

    static Validate(book){
        let schema = new Lorebook()
        Object.keys(schema).forEach(key => {
            if( book[key] ){
                let a = typeof book[key]
                let b = typeof schema[key]
                if( a === b ){
                    schema[key] = book[key]
                }
            }
        })
        return schema
    }

    static GetAllLorebooks(){
        let books = []
        let target = path.join( ".", Lorebook.path )
        console.debug( chalk.blue( "Reading lorebooks from " + chalk.blue(target)))
        if(!fs.existsSync(target)){
            fs.mkdirSync(target, { recursive: true });
        }

        let files = fs.readdirSync(target)
        for(let i = 0; i < files.length; i++){
            try{
                let filepath = path.join( target, files[i] )
                let content = fs.readFileSync( filepath, "utf-8")
                let parsed = JSON.parse( content )
                if( parsed ){
                    parsed = Lorebook.Validate(parsed)
                }
                parsed.temp = {}
                parsed.temp.filepath = filepath
                books.push(parsed)
            }catch(error){
                console.warn( chalk.yellow( error ))
            }
        }

        return books
    }

    static Save( book ){
        try{
            let target = book.temp && book.temp.filepath ? book.temp.filepath : undefined
            if( !target ){
                target = (book.name ? `${book.name}-${new Date().getTime()}` : new Date().getTime())
                target += ".json"
                target = path.join(Lorebook.path, target)
            }
            target = target.toLowerCase().replaceAll(/\s+/gmi, "_")

            if(!fs.existsSync(target)){
                fs.mkdirSync( path.dirname(target), { recursive: true });
            }

            book = Lorebook.Validate(book)
            let json = JSON.stringify(book, function(key, value){ 
                return key != "temp" ? value : undefined;
            });
            
            fs.writeFileSync(target, json)
            console.debug( chalk.blue( `Saved lorebook at ${target}` ))
            return true

        }catch(error){
            console.warn( chalk.yellow( `Could not save lorebook\n${error}` ))
        }

        return false
    }

    static Delete( book ){
        try{
            let target = book.temp && book.temp.filepath ? book.temp.filepath : undefined
            if( !target ){
                target = (book.name ? `${book.name}-${new Date().getTime()}` : new Date().getTime())
                target += ".json"
                target = path.join( Lorebook.path, target )
            }
            target = target.toLowerCase().replaceAll(/\s+/gmi, "_")
            fs.unlinkSync(target)
            return true
        }catch(error){
            console.warn("Error trying to delete chat:\n" + error.message)
            return false
        }
    }
}