const observer = new IntersectionObserver(onIntersect)

function onIntersect(entries: IntersectionObserverEntry[]){
    entries.forEach((entry : IntersectionObserverEntry): void => {
        if( entry.isIntersecting ){
            entry.target.dispatchEvent(new Event("lazyload"))
        }
    })
}

export function LazyLoad(node : HTMLElement){
    observer.observe(node)
    return{
        destroy(){
            observer.unobserve(node)
        }
    }
}