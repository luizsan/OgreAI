export function resize( node : HTMLElement, container? : HTMLElement ){
    node.style.height = "0px";
    node.style.height = Math.abs(node.scrollHeight) + "px";
    node.style.overflowY = 'hidden';
    if( container ){
        container.scrollIntoView({ block: "nearest" })
    }else{
        node.scrollIntoView({ block: "nearest" })
    }
}

export function AutoResize( node : HTMLElement, container? : any ){
    resize(node, container);
    node.addEventListener('input', () => resize(node, container));
    node.addEventListener('change', () => resize(node, container));
    return {
        update: (container? : any) => {
            resize(node, container)
        },
        destroy: () => {
            node.removeEventListener('input', () => resize(node, container))
            node.removeEventListener('change', () => resize(node, container))
        }
    }
}