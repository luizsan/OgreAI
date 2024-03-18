import { marked } from "marked"

const regex_quotes = /(?:&quot;|")([^"]+)(?:&quot;|")/gi
export const marked_renderer = new marked.Renderer();
marked_renderer.del = function(text : string){ return "~" + text + "~"; };
marked_renderer.pre = function(text : string){ return text; };
marked_renderer.code = function(text : string) {
    return '<pre><code>' + text + '</code></pre>';
};

marked_renderer.text = function(text : string){
    return text.replace(regex_quotes, `<span class="quote">"$1"</span>`)
}

marked.setOptions({
    breaks: true,
    renderer: marked_renderer,
})

export function parseNames(text : string, user : string, bot : string){
    if(!text) return text;
    text = text.replaceAll("[NAME_IN_MESSAGE_REDACTED]", user)
    text = text.replaceAll("<USER>", user)
    text = text.replaceAll("<BOT>", bot)
    text = text.replace(/{{user}}/gmi, user)
    text = text.replace(/{{char}}/gmi, bot)
    return text
}

export function relativeTime( datetime : Date ){
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

    if (days > 0) {
        return days > 1 ? `${full}` : `Yesterday at ${time}`;
    } else {
        return `Today at ${time}`
    }
}