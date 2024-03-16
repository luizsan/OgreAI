import fs from 'fs';
import chalk from 'chalk'

let _loaded = false
let whitelist = []
let filepath = "../whitelist.txt"

function loadWhitelist(){
    if (fs.existsSync(filepath)) {
        try {
            let raw = fs.readFileSync(filepath, 'utf-8');
            whitelist = raw.split('\n').map(line => line.trim()).filter(line => 
                line && !line.startsWith("#")
                );
            console.log(`Whitelist:\n${whitelist.join("\n")}`)
        } catch (e) {
            console.error(chalk.red(e))
        }
    }
}

function whitelistMiddleware(req, res, next){
    if(_loaded){
        loadWhitelist()
    }

    const agent = req.headers['user-agent'];
    let origin = req.headers.origin
    
    if( origin ){
        origin = origin.replace("localhost", "127.0.0.1") // localhost
        origin = origin.replace(/^.*\:\/\//gmi, "") // protocol 
        origin = origin.replace(/\:.*$/gmi, "") // port 
    }

    const match = whitelist.some(entry => {
        const regex = new RegExp('^' + entry.replace(/\./g, '\\.').replace(/\*/g, '[0-9]+') + '$');
        return entry.match(regex);
    });

    if (match){;
        let message = `Forbidden connection attempt from '${origin} // ${agent}'. Please add your IP address in whitelist.`;
        console.log(chalk.red(message));
        return res.status(403).send({error: message});
    }else{
        next()
    }
}

export default { whitelistMiddleware }