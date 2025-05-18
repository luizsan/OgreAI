<script lang="ts">
    import * as Dialog from "@/modules/Dialog.ts";
    import * as Server from "@/Server";
    import * as SVG from "@/svg/Common.svelte";

    let self : HTMLElement;
    const key : string = "api_auth"

    // bind
    export let elements : Array<any> // list of presets
    export let url : string = ""
    export let auth : string = ""

    let index : number = findEntryByContent(url, auth)
    $: {
        if( elements ){
            refreshIndex()
        }
    }
    $: can_apply = elements && index > -1 && (url != elements[index].address || auth != elements[index].password);
    $: can_delete = elements && index > -1 && (url == elements[index].address && auth == elements[index].password);

    function findEntryByContent(s : string, auth : string){
        if(!elements) return -1
        return elements.findIndex((item) => item.address == s && item.password == auth)
    }

    function refreshIndex(){
        index = findEntryByContent(url, auth)
    }

    function setPreset(i : number){
        if( i > -1 ){
            // console.log(elements.at(i))
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

    async function savePreset(){
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

        let new_name = await Dialog.prompt("OgreAI", "Choose a name for the saved authentication:", target_name )
        if( new_name ){
            let existing_item = elements.find((item) => item.name == new_name)
            if( existing_item ){
                existing_item.address = url
                existing_item.password = auth
            }else{
                elements.push({ "name": new_name, "address": url, "password": auth })
            }

            elements = elements;
            Server.request("/save_presets", { type: key, data: elements })
            refreshIndex()
        }
    }

    async function deletePreset(){
        const ok = await Dialog.confirm("OgreAI",`Do you really want to delete preset '${elements[index].name}'?\nThis action cannot be undone.`)
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
    <div class="component container focus">
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
                        <button class="component clear {can_apply ? "confirm" : "normal disabled"}" title="Apply preset" disabled={!can_apply} on:click={applyPreset}>{@html SVG.refresh} Revert</button>
                    {:else}
                        <button class="component clear {can_delete ? "danger" : "normal disabled"}" title="Delete preset" disabled={!can_delete} on:click={deletePreset}>{@html SVG.trashcan} Delete</button>
                    {/if}
                    <button class="component clear info" title="Save current" on:click={savePreset}>{@html SVG.save} Save</button>
                    <button class="component clear normal" title="Clear" on:click={clear}>{@html SVG.close} Clear</button>
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
                <div class="icon normal disabled">{@html SVG.key}</div>
                <input type="password" class="component clear wide" placeholder="Insert API authentication..." bind:value={auth} style="flex: 1 1 auto">
            </div>
        </div>
    </div>
</div>


<style>
    hr{
        position: absolute;
        left: 50%;
        translate: -50% 0px;
        width: calc( 100% - 24px );
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
        height: 36px;
        padding: 8px 12px;
        width: 100%;
        height: 100%;
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
        padding: 8px 16px;
    }

    .field .icon{
        position: absolute;
        width: 32px;
        height: 100%;
        display: flex;
        left: 12px;
    }

    .field .icon :global(svg){
        align-self: center;
        width: 16px;
        height: 16px;
        opacity: 0.5;
    }

    .field input{
        padding-left: 36px;
        height: 36px;
    }

</style>