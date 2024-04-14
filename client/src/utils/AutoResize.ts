export function resize( node : HTMLElement, container? : HTMLElement ){
    node.style.height = "0px";
    node.style.height = Math.abs(node.scrollHeight) + "px";
    if( container ){
        container.scrollIntoView({ block: "nearest" })
    }else{
        node.scrollIntoView({ block: "nearest" })
    }
}

export function AutoResize( node : HTMLElement, options? : any ){
    function resizeCallback( _event : Event ){
        resize(node, options?.container);
    }

    resize(node, options?.container);
    node.addEventListener('input', resizeCallback);
    node.addEventListener('change', resizeCallback);
    return {
        update: (options : any) => {
            resize(node, options?.container)
        },
        destroy: () => {
            node.removeEventListener('input', resizeCallback)
            node.removeEventListener('change', resizeCallback)
        }
    }
}