<script lang="ts">
    import * as SVG from "@/svg/Common.svelte";
    import type { ComponentType } from "svelte";
    import { createEventDispatcher } from "svelte";

    export let list: Array<any> = [];
    export let template: ComponentType = null;
    export let after = (_list : Array<any>) => {};

    const dispatch = createEventDispatcher();

    // DOM elements
    let container : HTMLElement;
    let picked : HTMLElement;
    let marker : HTMLElement;
    let target : Element;

    // drag & touch
    let direction : number;
    const touch_duration : number = 100;
    let touch_timer;

    function comparePosition(y : number, e : Element){
        if( !e ) return;
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

    async function pickItem(e, touch, index) {
        const reorderableItem: HTMLElement = container.querySelector(`[id="${index}"]`);
        if (!reorderableItem) return;

        if( touch ){
            if( e.touches.length == 1){
                touch_timer = setTimeout(() => touchedItem(reorderableItem, e), touch_duration)
            }
        }else{
            // Required for some browsers to allow dragging
            e.dataTransfer.setData('text/plain', '');
            // picked = e.target;
            picked = reorderableItem;
            pickedItem(e)
        }

        function touchedItem(element, event){
            picked = element;
            pickedItem(event)
        }

        function pickedItem(event){
            marker.style.visibility = "visible"
            const y = touch && event.touches ? event.touches[0].clientY : event.clientY;
            comparePosition(y, picked)
            container.insertBefore(marker, direction > 0 ? picked.nextSibling : picked)
        }
    }

    function moveItem(e, touch = false) {
        e.preventDefault()
        const y = touch && e.touches.length == 1 ? e.touches[0].clientY : e.clientY;
        const elements = container.querySelectorAll('.reorderable-item');
        elements.forEach((element) => {
            comparePosition(y, element)
        });

        if (target && container.contains(target)) {
            if (direction > 0 && target.nextSibling) {
                container.insertBefore(marker, target.nextSibling)
            } else {
                container.insertBefore(marker, target)
            }
        }
    }

    function dropItem() {
        if(touch_timer) {
            clearTimeout(touch_timer);
            touch_timer = null;
        }
        if( picked && target ){
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
        let elements_list = Array.from(container.children).filter((item) => {
            return item.classList.contains("reorderable-item") || item.classList.contains("marker")
        })
        let marker_index = elements_list.indexOf(marker)
        let picked_index = parseInt(picked.id)
        if( picked_index === marker_index || picked_index === marker_index - 1){
            return
        }
        container.insertBefore(marker, container.firstChild)

        const picked_item = list[picked_index]
        list.splice(marker_index, 0, picked_item)
        if( marker_index > picked_index ){
            list.splice(picked_index, 1)
        }else{
            list.splice(picked_index + 1, 1)
        }

        list = list
        dispatch("change")
        after(list)
    }

    function handleItemChange(e: Event, item: any, index: number){
        // console.log(item, index)
        after(list)
    }
</script>


<div class="container component"
    role="list"
    on:dragover={(e) => moveItem(e, false)}
    on:dragend={dropItem}
    on:touchmove={(e) => moveItem(e, true)}
    on:touchend={dropItem}
>

    <div class="list" bind:this={container}>
        {#each list as item, i}
            <div class="reorderable-item" id={ i .toString() }>
                <div
                    class="handle center"
                    role="listitem"
                    draggable={true}
                    on:dragstart|stopPropagation={(e) => pickItem(e, false, i)}
                    on:touchstart|stopPropagation={(e) => pickItem(e, true, i)}
                >
                { @html SVG.reorder }
                </div>

                <div class="template">
                    {#if template}
                        <svelte:component
                            this={template}
                            item={item}
                            on:change={(e) => handleItemChange(e, item, i)}
                        />
                    {:else}
                        <div class="text">{@html JSON.stringify(item)}</div>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
    <div bind:this={marker} class="marker"/>
</div>


<style>
    div{
        box-sizing: border-box;
    }

    .container.component{
        padding: 0px;
    }

    .list{
        position: relative;
        padding: 2px;
    }

    .reorderable-item {
        display: grid;
        grid-template-columns: 36px auto;
        user-select: none;
        width: 100%;
        border-radius: 2px;
    }

    .reorderable-item:has(:hover){
        background: var( --surface-neutral-300);
    }

    .handle{
        width: 100%;
        height: 100%;
        opacity: 0.333;
        color: gray;
        cursor: grab;
        user-select: none;
        align-self: center;
    }

    .handle:hover{
        opacity: 1;
    }

    .handle :global(svg){
        width: 100%;
        height: 16px;
        translate: 0px 0px;
    }

    .template{
        display: flex;
        align-items: center;
    }

    .template .text{
        word-break: break-word;
        font-size: 90%;
        padding: 4px;
    }

    .marker{
        left: 0px;
        right: 0px;
        position: absolute;
        height: 2px;
        translate: 0px -50%;
        background: cyan;
        visibility: hidden;
        z-index: calc(var( --layer-base ) + 1);
    }
</style>

