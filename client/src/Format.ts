import { marked } from "marked"

export const marked_renderer = new marked.Renderer();
marked_renderer.del = function(text : string){ return "~" + text + "~"; };
marked_renderer.pre = function(text : string){ return text; };
marked_renderer.code = function(text) {
    return '<code>' + text + '</code>';
};

marked.setOptions({
    breaks: true,
    renderer: marked_renderer,
})

export const date_options : Intl.DateTimeFormatOptions = {
    "hour12": false,
    "hourCycle": "h23",
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