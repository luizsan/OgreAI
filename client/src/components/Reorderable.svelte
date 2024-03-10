<script lang="ts">
    import * as SVG from "../utils/SVGCollection.svelte";

    export let list : Array<any> = []
    export let defaults : object = {}
    export let presets : object = {}
    export let update = (v: any) => {}

    // reorderable
    let container : HTMLElement;
    let picked : HTMLElement;
    let marker : HTMLElement;
    let target : Element;
    let direction : number;
    
    // touch
    const touch_duration : number = 100;
    let touch_timer;


    function comparePosition(y : number, e : Element){
        if( !e ) return;
        if( e.classList.contains("locked")) return;
        const rect = e.getBoundingClientRect();
        if (y > rect.top && y < rect.bottom) {
            if (y < rect.top + rect.height * 0.5) {
                target = e
                direction = -1
            } else {
                target = e
                direction = 1
            }
        }
    }

    async function pickItem(e, touch = false) {
        if( touch ){
            if( e.touches.length == 1){
                touch_timer = setTimeout(touchedItem, touch_duration)
            }
        }else{
            // Required for some browsers to allow dragging
            e.dataTransfer.setData('text/plain', '');
            picked = e.target;
            pickedItem()
        }
        
        function touchedItem(){
            picked = e.targetTouches[0].target;
            pickedItem()
        }

        function pickedItem(){
            if(picked.classList.contains("locked")){
                picked = null
                return
            }
            marker.style.visibility = "visible"
            comparePosition(e.clientY, picked)
            container.insertBefore(marker, direction > 0 ? picked.nextSibling : picked)
        }
    }
    

    function moveItem(e, touch = false) {
        e.preventDefault()
        const y = touch && e.touches.length == 1 ? e.touches[0].clientY : e.clientY;
        const elements = container.querySelectorAll('.item');
        elements.forEach((element) => {
            comparePosition(y, element)
        });
        container.insertBefore(marker, direction > 0 ? target.nextSibling : target)
    }
    

    function dropItem() {
        if(touch_timer) {
            clearTimeout(touch_timer);
            touch_timer = null;
        }

        if( picked && !picked.classList.contains("locked") && target ){
            reorderItems()
        }
        picked = null
        target = null
        direction = 0
        marker.style.visibility = "hidden"
    }

    // reorders item based on DOM ids
    function reorderItems(){
        if(!container || !picked){
            return
        }

        // const elements = Array.from(container.querySelectorAll('.item'))
        let picked_index = list.findIndex((e) => e.key === picked.id )
        let marker_index = list.findIndex((e) => e.key === target.id )

        if( picked_index === marker_index ){
            return
        }
        if( direction !== 0 && picked_index - direction === marker_index ){
            return
        }

        if( picked_index > marker_index && direction > 0 ){
            marker_index += direction
        }

        if( picked_index < marker_index && direction < 0 ){
            marker_index += direction
        }

        const picked_item = list.splice(picked_index, 1)[0]
        list.splice(marker_index, 0, picked_item)
        list = list
        update(list)
    }

    function getPresetsForKey(key: string){
        if( !defaults[key] || !presets[key] ){
            return []
        }
        return presets[key]
    }

</script>


<div class="container component"  
    on:dragover={moveItem} 
    on:dragend={dropItem} 
    on:touchmove={(e) => moveItem(e, true)} 
    on:touchend={dropItem}
>


    <div class="list" bind:this={container}>
        <div bind:this={marker} class="marker"/>
        
        {#each list as item}
            {#if item.key in defaults }

                <div 
                    class="item"
                    draggable="{ !defaults[item.key].locked }"
                    class:locked={ defaults[item.key].locked }
                    id={ item.key }
                    on:dragstart|self={pickItem} 
                    on:touchstart|self={(e) => pickItem(e, true)}
                >

                    <div class="handle">
                        {#if defaults[item.key].locked }
                            {@html SVG.lock}
                        {:else}
                            {@html SVG.reorder}
                        {/if}
                    </div>

                    <div class="center">
                        {#if defaults[item.key].toggleable}
                        <input type="checkbox" title="Toggle" bind:checked={item.enabled} on:change={() => update(list)} on:mousedown|preventDefault>
                        {/if}
                    </div>
                    
                    <div class="text disabled" class:unfocus={ defaults[item.key].toggleable && !item.enabled } title="Edit">{defaults[item.key].label}</div>
                </div>
                
            {/if}
        {/each}
    
    </div>
</div>


<style>
    div{
        box-sizing: border-box;
    }

    .container.component{
        padding: 0px;
        font-size: 100%;
    }

    .list{
        position: relative;
        padding: 2px;
    }

    input[type="checkbox"]{
        margin: 0px;
        padding: 0px;
        width: 16px;
        height: 16px;
        border: none;
    }
    
    .item {
        display: grid;
        grid-template-columns: 32px 36px auto;
        user-select: none;
        width: 100%;
        min-height: 32px;
        border-radius: 2px;
        align-items: center;
        font-size: 90%;
    }

    .item.locked{
        background: #60606010;
    }

    [draggable=true] {
        cursor: grab;
    }

    .item div{
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;  
    }

    .center{
        justify-content: center;
    }

    .text{
        padding: 0px 4px;
        translate: 0px -1px;
    }

    .item:not(.locked):hover{
        background: var( --component-bg-hover );
    }

    .unfocus{
        opacity: 0.333333;
    }

    .handle{
        color: gray;
        opacity: 0.333;
    }

    .handle :global(svg){
        width: 100%;
        height: 16px;
        translate: 2px 0px;
    }

    .marker{
        left: 0px;
        right: 0px;
        position: absolute;
        height: 2px;
        translate: 0px -50%;
        background: cyan;
        visibility: hidden;
        z-index: 1;
    }
</style>
