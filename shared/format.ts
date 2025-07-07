
import type { IChat, IChatMeta, IReplaceEntry } from "./types.d.ts";

const randomSplit = /[:]{2,}|[|]+/gm
const randomPattern = /{{random\s?\:+\s?([^}]+)}}/gi

export function parseNames(text: string, user: string, bot: string){
    if(!text) return text;
    text = text.replace(/(\[NAME_IN_MESSAGE_REDACTED\])/gmi, user)
    text = text.replace(/{{user}}/gi, user)
    text = text.replace(/<user>/gi, user)
    text = text.replace(/{{char}}/gi, bot)
    text = text.replace(/<bot>/gi, bot)
    return text
}

export function parseMacros(text: string, chat: IChat | IChatMeta){
    const date = new Date();
    const idle = getIdleTime(chat)
    text = randomReplace(text)
    text = text.replace(/{{date}}/gi, date.toLocaleDateString(undefined));
    text = text.replace(/{{time}}/gi, date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
    text = text.replace(/{{weekday}}/gi, date.toLocaleDateString(undefined, { weekday: 'long' }));
    text = text.replace(/{{idle_duration}}/gi, idle);
    return text
}

export function getIdleTime(chat: IChat | IChatMeta){
    return relativeTime( chat.last_interaction, true )
}

export function randomReplace(text: string){
    text = text.replace(randomPattern, (_match, replace) => {
        const list = replace.split(randomSplit).map((item: string) => item.trim()).filter((item: string) => item && item.length > 0);
        if(list.length < 2){
            return ''
        }
        const rng = Math.random()
        const index = Math.floor(rng * list.length)
        return list[index]
    })
    return text
}

export function regexReplace(text: string, modes: Array<string>, patterns: Array<IReplaceEntry>){
    let replaced = text
    patterns.forEach((item: IReplaceEntry) => {
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


export function toFilename(text: string){
    return text.replace(/[^a-z0-9]/gi, '_');
}

export function relativeTime(datetime: string | number | Date, precise = false ){
    const now = new Date();
    const target = new Date(datetime);

    const date = target.toLocaleDateString(undefined)
    const time = target.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    const full = `${date} ${time}`

    let time_a: number | Date;
    let time_b: number | Date;

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