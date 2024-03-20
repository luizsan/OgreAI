<script lang="ts">
    import Heading from "./Heading.svelte";
    import Checkbox from "./Checkbox.svelte";
    import Accordion from "./Accordion.svelte";
    import Lore from "./Lore.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";

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
        console.log("editing")
    }

    function closeEntry(){
        editingEntry = null;
    }

    function removeEntry(i : number){
        book.entries.splice(i, 1)
        book.entries = book.entries
        closeEntry()
        console.log(`Removed ${i}`)
        console.log(book.entries)
    }

</script>

<div class="content">
    <div class="section">
        <input type="text" class="component" placeholder="Lorebook name" bind:value={book.name}>
        <textarea class="component" placeholder="Lorebook description" rows={4} bind:value={book.description}></textarea>
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

    <Checkbox bind:value={book.recursive_scanning} title="Recursive scanning" description="Whether entries can trigger other entries."/>

    <div class="section">
        <Accordion name="Entries" size={book.entries.length} showSize={true} on:close={closeEntry}>
            {#if book.entries && book.entries.length > 0 }
                <div class:entries={!editingEntry}>
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

    .entries{
        width: 100%;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px 24px;
    }

    .add{
        height: 30px;
        flex-wrap: nowrap;
    }
</style>