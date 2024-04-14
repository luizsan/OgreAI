<script lang="ts">
    import * as Server from "../modules/Server.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";

    let self : HTMLElement;

    // bind
    export let elements : Array<any> // list of presets
    export let content : string = "" // actual content

    // properties
    export let key : string = "" // presets category
    export let rows : number = 4 // number of rows
    export let resizable : Boolean = false // textarea resizable?

    let index : number = findEntryByContent(content)
    $: can_apply = elements && index > -1 && content != elements[index].content;
    $: can_delete = elements && index > -1 && content == elements[index].content;

    function findEntryByContent(s : string){
        if(!elements) return -1
        return elements.findIndex((item) => item.content == s)
    }

    function refreshIndex(){
        index = findEntryByContent(content)
    }

    function setPreset(i : number){
        if( i > -1 ){
            content = elements.at(i).content;
        }
    }
    
    function clear(){
        content = ""
        update()
    }
    
    function update(){
        self.dispatchEvent(new Event("change", { bubbles: true }))
    }

    function applyPreset(){
        setPreset(index)
        update()
    }

    function savePreset(){
        let target_name = ""
        let existing_index = elements.findIndex((e) => e.content == content)
        if( index > -1 ){
            target_name = elements.at(index).name
        }else if( existing_index > -1 && elements.at(existing_index).name){
            target_name = elements.at(existing_index).name
        }else{
            let id = 0;
            do{
                target_name = "New preset " + id
                id += 1;
            }while( elements.some((item) => item.name == target_name ))
        }

        let new_name = prompt("Choose a name for the saved preset:", target_name )
        if( new_name ){
            let existing_item = elements.find((item) => item.name == new_name)
            if( existing_item ){
                existing_item.content = content
            }else{
                elements.push({ "name": new_name, "content": content })
            }

            elements = elements;
            Server.request("/save_presets", { type: key, data: elements })
            refreshIndex()
        }
    }

    function deletePreset(){
        const ok = confirm(`Do you really want to delete preset '${elements[index].name}'?\nThis action cannot be undone.`)
        if( ok ){
            elements.splice(index, 1)
            Server.request("/save_presets", { type: key, data: elements })
            elements = elements
            index = -1
            clear()
        }
    }
</script>


<div class="main" bind:this={self}>
    <div class="component container">
        {#if elements}
            <div class="top">
                <div class="list">
                    <select class="component borderless" bind:value={index} on:change={() => setPreset(index)}>
                        <option value={-1}>-- Select a preset --</option>
                        {#each elements as entry, i}
                            <option value={i}>{entry.name ?? `Preset ${i}`}</option>
                        {/each}
                    </select>
                </div>

                <div class="controls">
                    {#if can_apply}
                        <button class="component clear {can_apply ? "confirm" : "normal disabled"}" title="Apply preset" disabled={!can_apply} on:click={applyPreset}>{@html SVG.confirm} Apply</button>
                    {:else}
                        <button class="component clear {can_delete ? "danger" : "normal disabled"}" title="Delete preset" disabled={!can_delete} on:click={deletePreset}>{@html SVG.trashcan} Delete</button>
                    {/if}
                    <button class="component clear info" title="Save current" on:click={savePreset}>{@html SVG.save} Save</button>
                    <button class="component clear normal" title="Clear" on:click={clear}>{@html SVG.close} Clear</button>
                </div>
            </div>
            
            <hr>
        {/if}
        
        <textarea class="component clear wide" class:resizable={resizable} rows={rows > 0 ? rows : 0} bind:value={content}></textarea>
    </div>
</div>


<style>
    hr{
        position: absolute;
        left: 50%;
        translate: -50% 0px;
        width: calc( 100% - 20px );
        margin: 0px;
        border: none;
        border-bottom: 2px dotted gray;
        opacity: 0.2;
    }

    .main{
        display: flex;
        width: 100%;
        flex-direction: column;
        gap: 8px;
    }

    select{
        padding: 8px 12px;
        height: 32px;
        width: 100%;
        height: 36px;
    }

    textarea{
        margin: 0px;
        padding: 8px 12px;
        font-size: 0.9em;
        resize: none;
    }

    textarea.resizable{
        resize: vertical;
    }

    .list{
        flex: 1 1 content;
        min-width: 50%;
    }

    .top{
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        height: fit-content;
    }

    .controls{
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        flex-wrap: wrap;
    }

    .controls button{
        height: 36px;
        display: flex;
        align-items: center;
        padding: 4px 16px;
    }
</style>