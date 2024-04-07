
const randomSplit = /[:|]+/gm
const randomPattern = /{{random\s?\:+\s?([^}]+)}}/gi

export function parseNames(text, user, bot){
    if(!text) return text;
    text = text.replace(/(\[NAME_IN_MESSAGE_REDACTED\])/gmi, user)
    text = text.replace(/{{user}}/gi, user)
    text = text.replace(/<user>/gi, user)
    text = text.replace(/{{char}}/gi, bot)
    text = text.replace(/<bot>/gi, bot)
    return text
}

export function parseMacros(text){
    const date = new Date();
    text = randomReplace(text)
    text = text.replace(/{{date}}/gi, date.toLocaleDateString());
    text = text.replace(/{{time}}/gi, date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    text = text.replace(/{{weekday}}/gi, date.toLocaleDateString("en-gb", { weekday: 'long' }));
    return text
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