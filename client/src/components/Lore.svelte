<script lang="ts">
    import Heading from "./Heading.svelte";
    import Accordion from "./Accordion.svelte";
    import * as SVG from "../utils/SVGCollection.svelte"
    import Checkbox from "./Checkbox.svelte";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let open : boolean = false;
    export let entry : ILorebookEntry = {} as ILorebookEntry;
    
    let self : HTMLElement;

    $: keys_index = [
        {   
            key: "keys", 
            label: "Primary keys", 
            enabled: () => true
        },
        {   
            key: "secondary_keys", 
            label: "Secondary keys", 
            enabled: () => entry.selective && !entry.constant
        },
    ]

    function toggle(){
        open = !open;
        dispatch(open ? "open" : "close")
    }

    function remove(){
        open = false;
        dispatch("remove")
    }

    function addKeyTo(target : Array<string>){
        target.push("")
        entry = entry;
    }

    function removeKeyFrom(target : Array<string>, index : number){
        target.splice(index, 1)
        entry = entry;
    }

    function clearKeys(target : Array<string>){
        target.splice(0, target.length)
        entry = entry;
    }
</script>


<div class="content" bind:this={self}>
    {#if open}
        <div class="top">
            <button class="component normal clear back" on:click={toggle}>{@html SVG.arrow}</button>
            <div>
                <p class="explanation">Currently editing</p>
                <p class="title">{entry.name ?? "Lorebook entry"}</p>
            </div>
            <button class="component danger remove" on:click={remove}>{@html SVG.trashcan}</button>
        </div>

        <div class="section">
            <Heading title="Entry name"/>
            <input type="text" class="component" placeholder="Entry name" bind:value={entry.name}/>
        </div>

        <div class="section">
            <Heading title="Content" description="Description that will be inserted in the prompt."/>
            <textarea class="component" rows={8} placeholder="Entry content" bind:value={entry.content}></textarea>
        </div>
        
        <div class="grid">
            <div class="section">
                <Heading title="Insertion order" description="Activated entries are sorted by this value. Lower values means it's inserted first."/>
                <input type="number" class="component" bind:value={entry.insertion_order}/>
            </div>

            <div class="section">
                <Heading title="Priority" description="If the token budget of the lorebook is reached, a lower priority means the entry will be discarded first."/>
                <input type="number" class="component" bind:value={entry.priority}/>
            </div>
        </div>

        <Checkbox 
            bind:value={entry.constant} 
            title="Constant" 
            description="Guarantees to insert the entry if it's within the token budget."
        />

        {#if !entry.constant}
            <Checkbox 
                bind:value={entry.selective} 
                title="Selective"
                description="Activation of this entry requires a key from both primary and secondary keys."
            />

            <Checkbox 
                bind:value={entry.case_sensitive} 
                title="Case sensitive"
                description="Turn this off to ignore uppercase or lowercase when searching for keys."
            />
        {/if}

        {#each keys_index as index }
            {#if index.enabled}
                {@const target = entry[index.key]}

                <Accordion name={index.label}>
                    {#if target && target.length > 0 }
                        <div class="keys">
                            {#each target as key, i}
                                <div class="key">
                                    <button class="component danger remove" on:click={() => removeKeyFrom(target, i)}>{@html SVG.trashcan}</button>
                                    <input type="text" class="component" placeholder="Insert key" bind:value={key}>
                                </div>
                            {/each}
                        </div>
                    {/if}
                    <div class="section horizontal">
                        <button class="component normal add" on:click={() => addKeyTo(target) }>{@html SVG.plus}Add key</button>
                        <button class="component danger add" on:click={() => clearKeys(target) }>{@html SVG.close}Clear keys</button>
                    </div>
                </Accordion>
            {/if}
        {/each}

    {:else}
        <div class="section closed">
            <input type="checkbox" class="component" bind:checked={entry.enabled}>
            <button class="component normal wide entry" on:click={toggle}>{entry.name ?? "New lorebook entry"}</button>
        </div>

    {/if}
</div>

<style>
    .content{
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .grid{
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 32px;
    }

    .closed{
        display: grid;
        grid-template-columns: 32px auto;
        gap: 4px;
    }

    .closed input[type="checkbox"]{
        width: 20px;
        height: 20px;
    }

    .top{
        display: grid;
        grid-template-columns: 36px auto 32px;
        gap: 8px;
    }

    .top button{
        padding: 0px;
        width: 100%;
        height: 100%;
        display: flex;
        align-self: center;
        place-items: center;
        place-content: center;
    }

    .entry{
        padding: 4px 8px;
    }

    .title{
        font-size: 120%;
    }

    .back :global(svg){
        width: 24px;
        height: 24px;
    }

    .remove{
        width: 100%;
        height: fit-content;
        padding: 0px;
        place-items: center;
        place-content: center;
    }

    .keys{
        width: 100%;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px 24px;
    }

    .key{
        display: grid;
        grid-template-columns: 32px auto;
        gap: 8px;
    }

</style>