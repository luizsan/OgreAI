<script lang="ts">
    import * as SVG from "../utils/SVGCollection.svelte";
    import Preset from "../components/Preset.svelte";
    import { currentSettings } from "../State";

    const default_data = {
        base_prompt: { 
            toggleable: false, editable: true, 
            label: "Main prompt",
            description: "Used to give basic instructions to the model on how to behave in the chat.",
        },

        description: { 
            toggleable: true, editable: false, 
            label: "Character description",
            description: "",
        },

        personality: { 
            toggleable: true, editable: false, 
            label: "Character personality",
            description: "",
        },

        scenario: { 
            toggleable: true, editable: false, 
            label: "Character scenario",
            description: "",
        },

        mes_example: { 
            toggleable: true, editable: false, 
            label: "Example chat",
            description: "",
        },
        
        persona: { 
            toggleable: true, editable: false, 
            label: "User persona",
            description: "",
        },

        messages: { 
            toggleable: false, editable: false, 
            label: "Chat history",
            description: "",
        },

        sub_prompt: { 
            toggleable: true, editable: true, 
            label: "Jailbreak prompt",
            description: "Appended at the end of the user's last message to reinforce instructions.",
        },

        prefill_prompt: { 
            toggleable: true, editable: true, 
            label: "Prefill prompt",
            description: "Appended at the very end of the prompt to enforce instructions and patterns.",
        },
    }
    
    export let list : Array<any> = []
    export let update = (v: any) => {}

    // state
    let editing : Boolean = false
    let current_key : string = ""

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

        reorderItems()
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

    function getPresetsForKey(key){
        if( !(key in default_data) || !(key in $currentSettings.presets) ){
            return []
        }
        return $currentSettings.presets[key]
    }

</script>


<div class="container component" class:focusable={editing}  
    on:dragover={moveItem} 
    on:dragend={dropItem} 
    on:touchmove={(e) => moveItem(e, true)} 
    on:touchend={dropItem}
>


    <div class="list" bind:this={container} class:invisible={editing} class:disabled={editing}>
        <div bind:this={marker} class="marker"/>
        {#each list as item}
            {#if item.key in default_data}

                <div 
                    class="item" 
                    draggable="true"
                    id={ item.key }
                    on:dragstart|self={pickItem} 
                    on:touchstart|self={(e) => pickItem(e, true)}
                >

                    <div class="handle">{@html SVG.handle}</div>

                    <div class="center">
                        {#if default_data[item.key].toggleable}
                        <input type="checkbox" title="Toggle" bind:checked={item.enabled} on:change={() => update(list)}>
                        {/if}
                    </div>

                    <div class="text disabled" class:unfocus={ !item.enabled } title="Edit">{default_data[item.key].label}</div>

                    <div class="center">
                        {#if default_data[item.key].editable}
                        <button class="confirm" on:click={() => { editing = true; current_key = item.key; }}>{@html SVG.edit}</button>
                        {/if}
                    </div>

                </div>
                
            {/if}
        {/each}
    </div>

    {#if editing}
    <div class="overlay focusable">
        <div class="top">
            <button class="normal" on:click={() => { editing = false; }}>{@html SVG.arrow}</button>
            <div>
                <div class="title">Editing: {default_data[current_key].label}</div>
                <div class="explanation">{default_data[current_key].description}</div>
            </div>
        </div>
        <div class="bottom">
            <Preset 
                elements={getPresetsForKey(current_key)} 
                content={ list.find((e) => e.key == current_key).content } 
                item={(v) => v.content } 
                update={(v) => list.find((e) => e.key === current_key).content = v } 
            />
        </div>
    </div>
    {/if}

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
        grid-template-columns: 20px 32px auto 36px;
        user-select: none;
        width: 100%;
        min-height: 32px;
        border-radius: 2px;
        align-items: center;
        font-size: 90%;

    }

    .overlay{
        display: grid;
        grid-template-rows: min-content auto;
        position: absolute;
        inset: 1px;
        /* padding: 2px; */
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

    .item:hover{
        background: var( --component-bg-hover );
    }

    .unfocus{
        opacity: 0.25
    }

    .handle{
        color: gray;
        opacity: 0.25;
    }

    .handle :global(svg){
        width: 20px;
        height: 20px;
        translate: 1px 0px;
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

    .top{
        padding: 8px 4px 8px 2px;
        display: grid;
        grid-template-columns: 32px auto;
        gap: 4px;
    }

    .bottom{
        display: flex;
        padding: 0px 0px 0px 4px;
        flex: 1 1 auto;
        font-size: 90%;
    }

    .title{
        font-weight: 600;
        margin: 0px;
    }

    .explanation{
        color: #606060;
        font-size: 85%;
    }

    button{
        padding: 0px;
        width: 100%;
        height: 100%;
    }

    button :global(svg){
        width: 20px;
        height: 20px;
        translate: 0px 1px;
        
    }
</style>
