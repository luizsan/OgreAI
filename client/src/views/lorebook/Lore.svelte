<script lang="ts">
    import type { ILorebookEntry } from "@shared/types";
    import Heading from "@/components/Heading.svelte";
    import Accordion from "@/components/Accordion.svelte";
    import Entry from "@/components/Entry.svelte";
    import * as SVG from "@/svg/Common.svelte"
    import Checkbox from "@/components/Checkbox.svelte";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let open : boolean = false;
    export let entry : ILorebookEntry = {} as ILorebookEntry;

    let self : HTMLElement;

    $: title = entry.name || entry.comment || "New lorebook entry"
    $: keys_index = [
        {
            key: "keys",
            label: "Primary keys",
            enabled: () => !entry.constant
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
        if( target.length > 0 ){
            target.splice(0, target.length)
            entry = entry;
            self.dispatchEvent(new Event("change", { bubbles: true }))
        }
    }
</script>


<div class="content" bind:this={self}>
    {#if open}
        <div class="top">
            <button class="component normal clear back" on:click={toggle}>{@html SVG.arrow}</button>
            <div class="grow"><Heading title={title} description="Currently editing" reverse={true} scale={1.2}/></div>
            <button class="component danger remove" on:click={remove}>{@html SVG.trashcan} Delete</button>
        </div>

        <div class="section">
            <Heading title="Entry name"/>
            <input type="text" class="component" placeholder="Insert lore name" bind:value={entry.name}/>
        </div>

        <div class="section">
            <Heading title="Content" description="Description that will be inserted in the prompt."/>
            <textarea class="component" rows={6} placeholder="Insert lore content" bind:value={entry.content}></textarea>
        </div>

        <div class="grid">
            <div class="section">
                <Heading title="Priority" description="If the token budget of the lorebook is reached, a lower priority means the entry will be discarded first."/>
                <input type="number" class="component" bind:value={entry.priority}/>
            </div>

            <div class="section">
                <Heading title="Insertion order" description="Activated entries are sorted by this value. Lower values means it's inserted first."/>
                <input type="number" class="component" bind:value={entry.insertion_order}/>
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
                description="Defines whether or not to treat uppercase and lowercase letters as distinct when searching for keys."
            />
        {/if}

        {#each keys_index as index }
            {#if index.enabled()}
                {@const target = entry[index.key]}

                <Accordion name={index.label} size={target.length} showSize={true}>
                    {#if target && target.length > 0 }
                        <div class="section">
                            {#each target as key, i}
                                <Entry bind:value={key} placeholder="Insert key" on:remove={()=> removeKeyFrom(target, i)}/>
                            {/each}
                        </div>
                    {/if}

                    <div class="section horizontal">
                        <button class="component normal add" on:click={() => addKeyTo(target) }>{@html SVG.add}Add key</button>
                        <button class="component danger add" on:click={() => clearKeys(target) }>{@html SVG.close}Clear keys</button>
                    </div>
                </Accordion>
            {/if}
        {/each}

    {:else}
        <div class="section closed">
            <input type="checkbox" class="component" bind:checked={entry.enabled}>
            <button class="component normal wide entry ellipsis" on:click={toggle}>
                <div class="ellipsis">{title}</div>
            </button>
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
        overflow-x: hidden;
        padding: 1px;
    }

    .closed input[type="checkbox"]{
        width: 20px;
        height: 20px;
    }

    .top{
        display: grid;
        grid-template-columns: 36px auto min-content;
        gap: 8px;
    }

    .top button{
        width: 100%;
        height: 100%;
        display: flex;
        align-self: center;
        place-items: center;
        place-content: center;
    }

    .entry{
        padding: 4px 8px;
        justify-content: flex-start;
    }

    .back{
        padding: 0px;
    }

    .back :global(svg){
        width: 24px;
        height: 24px;
    }

    button.remove{
        width: 100%;
        height: fit-content;
        place-items: center;
        place-content: center;
    }

    input[type="number"]{
        width: 100%;
    }

</style>