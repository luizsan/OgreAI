<script lang="ts">
    import { currentPrompt, currentPresets } from "@/State";
    import Preset from "@/components/Preset.svelte";
    import * as Dialog from "@/modules/Dialog.ts";
    import * as SVG from "@/svg/Common.svelte";

    export let list : Array<any> = []
    export let defaults : object = {}
    export let presets : Array<string> = [];
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

        let elements_list = Array.from(container.children).filter((item) => {
            return item.classList.contains("item") || item.classList.contains("marker")
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

        const locked = list.filter((item) => defaults[item.key].locked);
        locked.forEach((item) => {
            const from = list.findIndex((e) => e.key === item.key);
            const move = list.splice(from, 1)[0]
            const to = list.findIndex((e) => e.key === defaults[item.key].locked);
            list.splice(to + 1, 0, move);
        });

        list = list
        container.dispatchEvent(new Event('change', { bubbles: true }));
        after()
    }

    function toggleOpen(index: number, b: boolean) : void {
        list[index].open = b
        list = list
        container.dispatchEvent(new Event('change', { bubbles: true }));
        after()
    }

    async function removeAt(index: number) : Promise<void> {
        if( list[index].key !== "custom" ) return
        const ok = await Dialog.confirm("OgreAI", "Do you really want to remove this prompt?");
        if( !ok ) return
        list.splice(index, 1);
        list = list;
        container.dispatchEvent(new Event('change', { bubbles: true }));
        after()
    }

    function getPromptByKey(key : string){
        return $currentPrompt.findIndex((e) => e.key == key)
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


{#each list as item, i}
    {@const ref = defaults[item.key]}

    <div
        class="item"
        draggable="{ !ref.locked && !item.open}"
        class:locked={ ref.locked || (ref.editable && item.open)}
        id={ i.toString() }
        role="listitem"
        on:dragstart|self={pickItem}
        on:touchstart|self={(e) => pickItem(e, true)}
    >

        <!-- handle -->
        <div class="handle center disabled">
            {#if ref.locked }
                {@html SVG.lock}
            {:else}
                {@html SVG.reorder}
            {/if}
        </div>

        <!-- toggle -->
        <div class="center toggle" class:disabled={!ref.toggleable}>
            {#if ref.toggleable}
                <input type="checkbox" class="component small" title="Toggle" bind:checked={item.enabled} on:change={after} on:mousedown|preventDefault>
            {:else}
                <input type="checkbox" class="component small" disabled checked={true}>
            {/if}
        </div>

        <!-- label -->
        <div
            class="text deselect grow"
            class:unfocus={ ref.toggleable && !item.enabled }
            title="Edit"
        >
            {#if item.key === "custom"}
                {item.label || "Custom Prompt"}
            {:else}
                {ref.label}
            {/if}

            <!-- button -->
            <button
                class="normal wide editable clear"
                class:open={item.open}
                class:hidden={!ref.editable}
                class:deselect={!ref.editable}
                title="Open"
                on:click={() => {
                    if(ref.editable){
                        toggleOpen(i,!item.open)
                    }
                }}>
                <div class="min">
                    {@html SVG.arrow}
                </div>
            </button>
        </div>
    </div>

    {#if ref.editable && item.open}
        <div class="section container inside" class:custom={item.key === "custom"}>

            {#if item.key === "custom"}
                <div class="section horizontal custom">
                    <input
                        type="text"
                        class="component borderless wide"
                        placeholder="Custom Prompt"
                        bind:value={ $currentPrompt[i].label }
                    >
                    <select class="component borderless" bind:value={ $currentPrompt[i].role }>
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

            {#if presets.includes(item.key)}
                <Preset
                    bind:elements={ $currentPresets[item.key] }
                    bind:content={ $currentPrompt[getPromptByKey(item.key)].content }
                    key={ item.key }
                    resizable={true}
                    borderless={true}
                    highlighted={true}
                    rows={defaults[item.key]?.row_size || 4}
                />
            {:else}
                <textarea
                    class="component borderless wide"
                    rows={defaults[item.key]?.row_size || 4}
                    bind:value={ $currentPrompt[i].content }
                />
            {/if}

            {#if ref.overridable}
            <div class="section horizontal center override">
            <label class="deselect">
            <input
                type="checkbox"
                title="Allow Override"
                bind:checked={ $currentPrompt[i].allow_override }
            >
            Allow Override
            </label>

            </div>
            {/if}

            {#if item.key === "custom"}
                <div class="section horizontal wide center">
                    <button class="danger component custom delete" title="Remove" on:click={async () => await removeAt(i)}>
                        {@html SVG.trashcan} Delete
                    </button>
                </div>
            {/if}
        </div>
    {/if}
{/each}

<div bind:this={marker} class="marker"/>
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
    }

    .item {
        display: grid;
        grid-template-columns: 40px 32px auto;
        user-select: none;
        width: 100%;
        min-height: 36px;
        border-radius: 2px;
        align-items: center;
        font-size: 90%;
        cursor: move;
    }

    .item.locked{
        background-color: rgba(96, 96, 96, 0.1);
        cursor: not-allowed;
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
        padding: 10px 20px 20px 20px;
        background-color: rgba(0, 0, 0, 0.15);
        gap: 8px;
    }

    .inside.custom{
        padding: 20px 20px 20px 20px;
    }

    .section.custom{
        gap: 4px;
    }

    .inside .explanation{
        font-size: 80%;
    }

    .inside textarea, .inside input[type="text"], select{
        background-color: var( --surface-neutral-300);
        padding: 10px 12px;
        border-radius: 4px;
        min-height: 36px;
        --scrollbar-background: var( --surface-neutral-300);
    }

    .section.horizontal.center{
        gap: 16px;
    }

    .editable{
        position: absolute;
        inset: 0px;
        padding: 0px;
    }

    .editable :global(svg){
        position: absolute;
        right: 12px;
        transform: rotate(180deg);
    }

    .editable.open :global(svg){
        transform: rotate(-90deg);
    }

    .text{
        padding: 0px 4px 1px 8px;
        position: relative;
    }

    .item:not(.locked):hover{
        background: var( --surface-neutral-300);
    }

    button.custom.delete{
        margin-top: 4px;
    }

    .override{
        font-size: 80%;
    }

    .override input{
        margin-right: 4px;
    }

    .unfocus{
        opacity: 0.333333;
    }

    .handle{
        color: gray;
        opacity: 0.333;
        cursor: move;
    }

    .handle :global(svg){
        width: 100%;
        height: 16px;
        translate: 0px 0px;
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
