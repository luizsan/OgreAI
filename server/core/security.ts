import fs from 'fs';
import chalk from 'chalk';
import { Request, Response, NextFunction } from 'express';

let _loaded = false;
let list: string[] = [];
const filepath = "./whitelist.txt";

function load(): void {
    if (fs.existsSync(filepath)) {
        try {
            const raw = fs.readFileSync(filepath, 'utf-8');
            list = raw.split('\n').map(line => line.trim()).filter(line =>
            list = raw.split('\n').map(line => line.trim()).filter(line =>
                line && !line.startsWith("#")
            ));
            // console.debug(`Whitelist:\n${list.join("\n")}`);
        } catch (e) {
            console.error(chalk.red(e));
        }
    }
}

function whitelist(req: Request, res: Response, next: NextFunction): void {
    if (!_loaded) {
        load();
        _loaded = true;
    }

    const agent = req.headers['user-agent'] || '';
    let origin = req.headers.origin || '';

    if (origin) {
        origin = origin.replace("localhost", "127.0.0.1");
        origin = origin.replace(/^.*:\/\//gmi, "");
        origin = origin.replace(/:.*$/gmi, "");

        origin = origin.replace(/^.*\:\/\//gmi, "") // protocol
        origin = origin.replace(/\:.*$/gmi, "") // port
    }

    const match = list.some(entry => {
        const regex = new RegExp('^' + entry.replace(/\./g, '\\.').replace(/\*/g, '[0-9]+') + '$');
        return origin.match(regex);
    });

    if (!match) {
        const message = `Forbidden connection attempt from '${origin} // ${agent}'. Please add your IP address in whitelist.txt`;
        console.log(chalk.red(message));
        return res.status(403).send({ error: message });
    } else {
        next();
    }
}

export default { whitelist };
