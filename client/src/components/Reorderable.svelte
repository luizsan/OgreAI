<script lang="ts">
    import { currentSettingsAPI } from "../State";
    import * as SVG from "../utils/SVGCollection.svelte";

    export let list : Array<any> = []
    export let defaults : object = {}
    export let after = () => {}

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

        let picked_index = parseInt(picked.id)
        let marker_index = Array.from(container.children).indexOf(marker) + 1
        if( picked_index === marker_index ){
            return
        }
        const picked_item = list.splice(picked_index, 1)[0]
        list.splice(marker_index, 0, picked_item)
        list = list
        after()
    }

    function toggleOpen(index: number, b: boolean) : void {
        list[index].open = b
        list = list
        after()
    }

    function removeAt(index: number) : void {
        if( list[index].key !== "custom" ) return
        const ok = confirm(`Do you really want to remove this prompt?`);
        if( !ok ) return
        list.splice(index, 1);
        list = list;
        after()
    }

    function getPromptByKey(key : string){
        return $currentSettingsAPI.prompt.findIndex((e) => e.key == key)
    }

</script>


<div class="container component"
    role="list"
    on:dragover={moveItem}
    on:dragend={dropItem}
    on:touchmove={(e) => moveItem(e, true)}
    on:touchend={dropItem}
>

<div class="list" bind:this={container}>
<div bind:this={marker} class="marker"/>

{#each list as item, i}
{#if item.key in defaults && !defaults[item.key].disabled}

    <div
        class="item"
        draggable="{ !defaults[item.key].locked && !item.open}"
        class:locked={ defaults[item.key].locked || item.open}
        id={ i.toString() }
        role="listitem"
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
                <input type="checkbox" title="Toggle" bind:checked={item.enabled} on:change={after} on:mousedown|preventDefault>
            {:else}
                <input type="checkbox" disabled checked={true}>
            {/if}
        </div>

        <div
            class="text disabled"
            class:unfocus={ defaults[item.key].toggleable && !item.enabled }
            title="Edit"
        >
        {#if item.key === "custom"}
            {item.label || "Custom Prompt"}
        {:else}
            {defaults[item.key].label}
        {/if}
        </div>

        <div>
            {#if defaults[item.key].editable || defaults[item.key].sub_items}
                <button
                    class="normal wide toggle"
                    class:open={item.open}
                    title="Open"
                    on:click={() => toggleOpen(i,!item.open)}
                >{@html SVG.arrow}</button>
            {/if}
        </div>
    </div>

    {#if item.open}
        <div class="section container inside">
        {#if defaults[item.key].editable}
            {#if item.key === "custom"}
                <div class="section horizontal">
                    <input
                        type="text"
                        class="component borderless wide"
                        placeholder="Custom Prompt"
                        bind:value={ $currentSettingsAPI.prompt[i].label }
                    >
                    <select class="component borderless" bind:value={ $currentSettingsAPI.prompt[i].role }>
                        <option value="user">User</option>
                        <option value="assistant">Assistant</option>
                        <option value="system">System</option>
                    </select>
                </div>
            {:else}
                <div>
                    <div class="explanation">{defaults[item.key].description}</div>
                </div>
            {/if}
            <textarea
                class="component borderless wide"
                rows={defaults[item.key]?.row_size || 4}
                bind:value={ $currentSettingsAPI.prompt[i].content }
            />
            {#if item.key === "custom"}
            <div class="separator"></div>
            <div class="section horizontal wide center">
                <button class="danger component" title="Remove" on:click={() => removeAt(i)}>{@html SVG.trashcan} Delete</button>
            </div>
            {/if}
        {/if}

        {#if defaults[item.key].sub_items}
            {#each defaults[item.key].sub_items as sub_item}
                <div class="section top">
                    <div class="section horizontal center">
                        <input type="checkbox" bind:checked={ $currentSettingsAPI.prompt[getPromptByKey(sub_item)].enabled } on:change={after}>
                        <div class="wide">
                            <div class="title">{defaults[sub_item].label}</div>
                            <div class="explanation">{defaults[sub_item].description}</div>
                        </div>
                    </div>
                    <textarea
                        class="component borderless wide"
                        rows={defaults[sub_item]?.row_size || 4}
                        bind:value={ $currentSettingsAPI.prompt[getPromptByKey(sub_item)].content }
                    />
                </div>
            {/each}
        {/if}
        </div>
    {/if}

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
        cursor: pointer;
    }

    .item {
        display: grid;
        grid-template-columns: 32px 36px auto 64px;
        user-select: none;
        width: 100%;
        min-height: 32px;
        border-radius: 2px;
        align-items: center;
        font-size: 90%;
    }

    .item.locked{
        background-color: rgba(96, 96, 96, 0.1);
    }

    [draggable=true] {
        cursor: move;
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

    .inside{
        padding: 12px 20px 20px 20px;
        background-color: rgba(0, 0, 0, 0.1);
        gap: 16px;
    }

    .inside textarea, .inside input[type="text"], select{
        background-color: var( --component-bg-hover );
        padding: 6px 8px;
        border-radius: 4px;
    }

    .section.inside.top{
        gap: 12px;
    }

    .section.horizontal.center{
        gap: 16px;
    }

    .separator{
        min-height: 4px;
    }

    .toggle :global(svg){
        translate: 12px 0px;
        transform: rotate(180deg);
    }

    .toggle.open :global(svg){
        transform: rotate(-90deg);
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
