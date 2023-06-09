export function clickOutside(node : HTMLElement, exclude?: Array<HTMLElement>) {

    const handleClick = (event: Event) => {
        const target = event.target as HTMLElement;
        if (!event.target) {
            return;
        }

        if(exclude){
            for(let i = 0; i < exclude.length; i++){
                if(exclude[i] && exclude[i].contains(target)){
                    return
                }
            }
        }

        if (node && !node.contains(target) && !event.defaultPrevented) {
            node.dispatchEvent(
                new CustomEvent('outclick')
            );
        }
    }

	document.addEventListener("click", handleClick, true);

	return {
        update(newValue?: Array<HTMLElement>){
            exclude = newValue;
        },
		destroy() {
			document.removeEventListener("click", handleClick, true);
		}
	};
}