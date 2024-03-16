import { marked } from "marked"

export const marked_renderer = new marked.Renderer();
marked_renderer.del = function(text : string){ return "~" + text + "~"; };
marked_renderer.pre = function(text : string){ return text; };
marked_renderer.code = function(text : string) {
    return '<pre><code>' + text + '</code></pre>';
};

marked.setOptions({
    breaks: true,
    renderer: marked_renderer,
})

export const date_options : Intl.DateTimeFormatOptions = {
    "hour12": false,
    "year": "numeric",
    "month": "2-digit",
    "day": "2-digit",
    "hour": "2-digit",
    "minute": "2-digit",
}

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
    const offset = now.getTimezoneOffset() / 60;
    const target = new Date(new Date(datetime).getTime() + offset * 3600 * 1000 );
    const date = target.toLocaleDateString()
    const time = target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const full = `${date} ${time}`

    const difference = now.getTime() - target.getTime();
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