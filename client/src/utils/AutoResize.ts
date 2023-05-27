export function resize( node : HTMLElement ){
    node.style.height = "0px";
    node.style.height = Math.abs(node.scrollHeight) + "px";
    node.style.overflowY = 'hidden';
    node.scrollIntoView({ block: "nearest" })
}

export function AutoResize( node : HTMLElement, _param : any ){
    resize(node);
    node.addEventListener('input', () => resize(node));
    node.addEventListener('change', () => resize(node));
    return {
        update: () => {
            resize(node)
        },
        destroy: () => {
            node.removeEventListener('input', () => resize(node))
            node.removeEventListener('change', () => resize(node))
        }
    }
}