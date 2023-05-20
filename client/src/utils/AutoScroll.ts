import { tick } from "svelte";

export function AutoScroll(node : HTMLElement, _param : any) {
    const scroll = async () => {
        await tick()
        node.scrollTo({ top: node.scrollHeight });
    }
    scroll();
    return { 
        update: scroll
    }
}