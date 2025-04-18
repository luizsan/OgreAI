
const randomSplit = /[:]{2,}|[|]+/gm
const randomPattern = /{{random\s?\:+\s?([^}]+)}}/gi

/**
 * @param {string} text
 * @param {string} user
 * @param {string} bot
 */
export function parseNames(text, user, bot){
    if(!text) return text;
    text = text.replace(/(\[NAME_IN_MESSAGE_REDACTED\])/gmi, user)
    text = text.replace(/{{user}}/gi, user)
    text = text.replace(/<user>/gi, user)
    text = text.replace(/{{char}}/gi, bot)
    text = text.replace(/<bot>/gi, bot)
    return text
}


/**
 * @param {string} text
 * @param {IChat} chat
 */
export function parseMacros(text, chat){
    const date = new Date();
    const idle = getIdleTime(chat)
    text = randomReplace(text)
    text = text.replace(/{{date}}/gi, date.toLocaleDateString());
    text = text.replace(/{{time}}/gi, date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    text = text.replace(/{{weekday}}/gi, date.toLocaleDateString("en-gb", { weekday: 'long' }));
    text = text.replace(/{{idle_duration}}/gi, idle);
    return text
}

/**
 * @param {{ messages: IMessage[] }} chat
 */
export function getIdleTime(chat){
    const last = chat?.messages?.length || 0 > 0 ? chat.messages.at(-1) : null
    if( last && last.candidates.length > 0 ){
        const candidate = last.candidates.at(last.index)
        if( candidate ){
            return relativeTime( candidate.timestamp, true )
        }
    }
    return relativeTime( new Date(), true )
}

/**
 * @param {string} text
 */
export function randomReplace(text){
    text = text.replace(randomPattern, (_match, replace) => {
        const list = replace.split(randomSplit).map((item) => item.trim()).filter((item) => item && item.length > 0);
        if(list.length < 2){
            return ''
        }
        const rng = Math.random()
        const index = Math.floor(rng * list.length)
        return list[index]
    })
    return text
}

/**
 * @param {string} text
 * @param {string | any[]} modes
 * @param {any[]} patterns
 */
export function regexReplace(text, modes, patterns){
    let replaced = text
    patterns.forEach((item) => {
        if( !item || !item.enabled || !item.pattern )
            return

        if( item.mode != "always" && !modes.includes(item.mode)){
            return
        }

        const regex = new RegExp(item.pattern, item.flags || "")
        if( regex.test( replaced )){
            replaced = replaced.replace(regex, item.replacement ?? "")
        }
    })
    return replaced
}

/**
 * @param {string} text
 */
export function toFilename(text){
    return text.replace(/[^a-z0-9]/gi, '_');
}

/**
 * @param {string | number | Date} datetime
 */
export function relativeTime( datetime, precise = false ){
    const now = new Date();
    const target = new Date(datetime);
    
    const date = target.toLocaleDateString()
    const time = target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const full = `${date} ${time}`

    let time_a;
    let time_b;
    
    if( precise ){
        time_a = now.getTime()
        time_b = target.getTime()
    }else{
        time_a = new Date(
            now.getFullYear(), 
            now.getMonth(), 
            now.getDate()
        ).getTime()

        time_b = new Date(
            target.getFullYear(), 
            target.getMonth(), 
            target.getDate()
        ).getTime()
    }

    const difference = Math.abs(time_a - time_b);
    const seconds = Math.floor(difference / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);

    if( precise ){
        if( years > 0 ){
            return years > 1 ? `${years} years ago` : `A year ago`;
        }else if( months > 0 ){
            return months > 1 ? `${months} months ago` : `A month ago`;
        }else if( weeks > 0 ){
            return weeks > 1 ? `${weeks} weeks ago` : `A week ago`;
        }else if( days > 0 ){
            return days > 1 ? `${days} days ago` : `Yesterday`;
        }else if( hours > 0 ){
            return hours > 1 ? `${hours} hours ago` : `An hour ago`;
        }else if( minutes > 0 ){
            return minutes > 1 ? `${minutes} minutes ago` : `A minute ago`;
        }else if( seconds > 0 ){
            return seconds > 5 ? `${seconds} seconds ago` : `Just now`;
        }else{
            return `Today `;
        }
    }else{
        if (days > 0) {
            return days > 1 ? `${full}` : `Yesterday at ${time}`;
        } else {
            return `Today at ${time}`
        }
    }
}