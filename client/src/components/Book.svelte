<script lang="ts">
    import type { ILorebook, ILorebookEntry } from "@shared/types";
    import Heading from "./Heading.svelte";
    import Checkbox from "./Checkbox.svelte";
    import Accordion from "./Accordion.svelte";
    import Lore from "./Lore.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";

    let self : HTMLElement;

    export let book : ILorebook = { entries: [] } as ILorebook;
    let editingEntry : ILorebookEntry = null;

    function addEntry(){
        book.entries.push({
            enabled: true,
            priority: 0,
            constant: false,
            insertion_order: 0,
            case_sensitive: false,
            keys: [],
            secondary_keys: [],
            extensions: {},
        } as ILorebookEntry)

        book.entries = book.entries;
    }

    function editEntry(entry : ILorebookEntry){
        editingEntry = entry;
    }

    function closeEntry(){
        editingEntry = null;
    }

    async function removeEntry(i : number){
        const ok = confirm("Are you sure you want to delete this entry?\nThis action cannot be undone.")
        if( ok ){
            book.entries.splice(i, 1)
            book.entries = book.entries
            self.dispatchEvent(new Event("change", { bubbles: true }))
            closeEntry()
        }
    }

</script>

<div class="content" bind:this={self}>

    <div class="section">
        <input type="text" class="component" placeholder="Insert lorebook name" bind:value={book.name}>
        <textarea class="component" placeholder="Insert lorebook description" rows={4} bind:value={book.description}></textarea>
    </div>

    <div class="grid">
        <div class="section">
            <Heading title="Token budget" description="Tokens added by this lorebook will not exceed this amount."/>
            <input type="number" class="component min" min={0} step={1} bind:value={book.token_budget}>
        </div>

        <div class="section">
            <Heading title="Scan depth" description="Maximum amount of chat messages scanned for entries."/>
            <input type="number" class="component min" min={0} step={1} bind:value={book.scan_depth}>
        </div>
    </div>

    <Checkbox bind:value={book.recursive_scanning} title="Recursive scanning" description="Whether entries can trigger other entries. Not yet implemented." disabled={() => true}/>

    <div class="section">
        <Accordion name="Entries" size={book.entries.length} showSize={true} on:close={closeEntry}>
            {#if book.entries && book.entries.length > 0 }
                <div class:section={!editingEntry}>
                    {#each book.entries as entry, i}
                        {#if !editingEntry || editingEntry == entry}
                            <Lore bind:entry={entry} on:open={() => editEntry(entry)} on:close={closeEntry} on:remove={() => removeEntry(i)}/>
                        {/if}
                    {/each}
                </div>
            {/if}

            {#if !editingEntry}
                <button class="component normal add" on:click={addEntry}>{@html SVG.plus}Add entry</button>
            {/if}
        </Accordion>
    </div>
</div>

<style>
    .grid{
        width: 100%;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 48px;
    }

    .content{
        display: flex;
        flex-direction: column;
        gap: 32px;
        box-sizing: border-box;
    }

    .add{
        height: 30px;
        flex-wrap: nowrap;
    }

    input[type="number"]{
        width: 100%;
    }

</style>