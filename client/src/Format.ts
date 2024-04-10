import { marked } from "marked"

const randomSplit = /[:|]+/gm
const randomPattern = /{{random\s?\:+\s?([^}]+)}}/gi
const quotePattern = /(&quot;|")([^"]+)(\1)/gi

export const marked_renderer = new marked.Renderer();
marked_renderer.del = function(text : string){ return "~" + text + "~"; };
marked_renderer.list = function(text : string, ordered : boolean){
    return ordered ? '<ol>' + text + '</ol>' : '<ul>' + text + '</ul>';
}

marked_renderer.listitem = function(text : string){
    return '<li>' + text + '</li>';
}

marked_renderer.code = function(text : string) {
    text = text.replaceAll("&", "&gt;")
    text = text.replaceAll("<", "&lt;")
    text = text.replaceAll(">", "&gt;")
    return '<div class="codeblock"><code>' + text + '</code></div>';
};

marked_renderer.text = function(text : string){
    text = text.replace(quotePattern, `<span class="quote">"$2"</span>`)
    return text;
}

marked.setOptions({
    breaks: true,
    renderer: marked_renderer,
})

export function parseNames(text : string, user : string, bot : string){
    if(!text) return text;
    text = text.replace(/(\[NAME_IN_MESSAGE_REDACTED\])/gmi, user)
    text = text.replace(/{{user}}/gi, user)
    text = text.replace(/<user>/gi, user)
    text = text.replace(/{{char}}/gi, bot)
    text = text.replace(/<bot>/gi, bot)
    return text
}

export function parseMacros(text : string){
    const date = new Date();
    text = randomReplace(text)
    text = text.replace(/{{date}}/gi, date.toLocaleDateString());
    text = text.replace(/{{time}}/gi, date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    text = text.replace(/{{weekday}}/gi, date.toLocaleDateString("en-gb", { weekday: 'long' }));
    return text
}

export function regexReplace(text : string, modes : Array<string>, patterns : Array<any>){
    let replaced = text
    patterns.forEach((item : any) => {
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

export function randomReplace(text){
    text = text.replace(randomPattern, (_match, replace) => {
        const list = replace.split(randomSplit).map(item => item.trim()).filter(item => item && item.length > 0);
        if(list.length < 2){
            return ''
        }
        const rng = Math.random()
        const index = Math.floor(rng * list.length)
        return list[index]
    })
    return text
}

export function toFilename(text : string){
    return text.replace(/[^a-z0-9]/gi, '_');
}

export function relativeTime( datetime : Date, precise : boolean = false ){
    const now = new Date();
    const target = new Date(datetime);
    
    const date = target.toLocaleDateString()
    const time = target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const full = `${date} ${time}`

    const time_a = new Date(
        now.getFullYear(), 
        now.getMonth(), 
        now.getDate()
    ).getTime()

    const time_b = new Date(
        target.getFullYear(), 
        target.getMonth(), 
        target.getDate()
    ).getTime()

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