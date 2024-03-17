<script lang="ts">
    import * as Server from "../modules/Server.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";

    let self : HTMLElement;
    const key : string = "api_auth"

    // bind
    export let elements : Array<any> // list of presets
    export let url : string = ""
    export let auth : string = ""

    let index : number = findEntryByContent(url)
    $: {
        if( elements ){
            refreshIndex()
        }
    }
    $: can_apply = elements && index > -1 && url != elements[index].address;


    function findEntryByContent(s : string){
        if(!elements) return -1
        return elements.findIndex((item) => item.address == s)
    }

    function refreshIndex(){
        index = findEntryByContent(url)
    }

    function setPreset(i : number){
        if( i > -1 ){
            console.log(elements.at(i))
            url = elements.at(i).address;
            auth = elements.at(i).password
        }
    }

    function clear(){
        url = ""
        auth = ""
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
        let existing_index = elements.findIndex((e) => e.address == url)
        if( index > -1 ){
            target_name = elements.at(index).name
        }else if( existing_index > -1 && elements.at(existing_index).name){
            target_name = elements.at(existing_index).name
        }else{
            let id = 0;
            do{
                target_name = "New authentication " + id
                id += 1;
            }while( elements.some((item) => item.name == target_name ))
        }

        let new_name = prompt("Choose a name for the saved authentication:", target_name )
        if( new_name ){
            let existing_item = elements.find((item) => item.name == new_name)
            if( existing_item ){
                existing_item.address = url
                existing_item.auth = auth
            }else{
                elements.push({ "name": new_name, "address": url, "password": auth })
            }

            elements = elements;
            Server.request("/save_presets", { type: key, data: elements })
            refreshIndex()
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
                    <button class="component clear {can_apply ? "confirm" : "normal disabled"}" title="Apply preset" disabled={!can_apply} on:click={applyPreset}>{@html SVG.confirm} Apply</button>
                    <button class="component clear info" title="Save current" on:click={savePreset}>{@html SVG.save} Save</button>
                    <button class="component clear danger" title="Clear" on:click={clear}>{@html SVG.close} Clear</button>
                </div>
            </div>
            
            <hr>
        {/if}

        <div class="group">
            <div class="field">
                <div class="icon normal disabled">{@html SVG.link}</div>
                <input type="text" class="component clear wide" placeholder="Insert API URL..." bind:value={url} style="flex: 1 1 auto">
            </div>
            <hr>
            <div class="field">
                <div class="icon normal disabled" style="transform: scaleX(-1)">{@html SVG.key}</div>
                <input type="password" class="component clear wide" placeholder="Insert API authentication..." bind:value={auth} style="flex: 1 1 auto">
            </div>
        </div>
    </div>
</div>


<style>
    hr{
        align-self: center;
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
        height: 32px;
        width: 100%;
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
        height: 32px;
        display: flex;
        align-items: center;
        padding: 4px 16px;
    }

    .controls button :global(svg){
        width: 16px;
        height: 16px;
    }
    
    .controls button.disabled{
        opacity: 0.25;
    }

    .field .icon{
        position: absolute;
        width: 32px;
        height: 100%;
        display: flex;
    }

    .field .icon :global(svg){
        align-self: center;
        width: 16px;
        height: 16px;
        left: 8px;
        opacity: 0.5;
    }

    .field input{
        margin-left: 24px;
    }

</style>