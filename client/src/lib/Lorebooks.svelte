<script lang="ts">

    import Heading from "../components/Heading.svelte"
    import Book from "../components/Book.svelte"
    import Loading from "../components/Loading.svelte";
    import Lore from "../components/Lore.svelte"
    import Tags from "../components/Tags.svelte";
    import * as SVG from "../utils/SVGCollection.svelte"
    import { currentLorebooks } from "../State"
    import Search from "../components/Search.svelte";
    import * as Server from "../modules/Server.svelte";
    import { tick } from "svelte";


    let editingBook : ILorebook = null;
    let searchResults : Array<ILorebook> = [];
    let loading : boolean = false;

    function createLorebook(){
        return {
            name: "",
            token_budget: 100,
            scan_depth: 5,
            recursive_scanning: false,
            entries: []
        } as ILorebook;
    }

    async function addLorebook(){
        let name = prompt("Choose a name for your new lorebook", "New lorebook")
        if( name ){
            let book = createLorebook()
            book.name = name
            let success = await Server.request("/save_lorebook", { book: book })
            if( success ){
                $currentLorebooks.push(book)
                $currentLorebooks = $currentLorebooks
                editingBook = book
            }
        }
    }

    function editLorebook(book : ILorebook){
        editingBook = book;
    }

    function closeLorebook(){
        editingBook = null;
    }

    async function removeLorebook(book : ILorebook){
        const ok = confirm("Are you sure you want to delete this lorebook?\nThis action cannot be undone.")
        if( ok ){
            let result = await Server.request("/delete_lorebook", { book: book })
            if( result ){
                await loadLorebooks();
                closeLorebook();
            }
        }
    }

    async function loadLorebooks(){
        loading = true;
        await Server.request("/get_lorebooks").then(data => {
            $currentLorebooks = data;
            $currentLorebooks = $currentLorebooks
            searchResults = $currentLorebooks
            searchResults.sort(sortLorebooks)
            searchResults = searchResults
            loading = false;
        })
    }

    async function saveBook(){
        await tick()
        console.log(editingBook)
        await Server.request("/save_lorebook", { book: editingBook })
    }

    function sortLorebooks(a,b){
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA < nameB) { return -1; }
        if (nameA > nameB) { return 1; }
        return 0;
    }

</script>

<div class="content wide">
    
    <div class="section">
        <Heading
            title="Global Lorebooks"
            description={`These lorebooks are enabled globally for all chats and will be inserted in the prompt as 'World Info'.`}
        />

        <Tags
            choices={$currentLorebooks}
            placeholder="Add lorebooks..."
            notFound="No lorebooks found matching search criteria"
            display={(v) => v.name}
            item={(v) => v.name}
        />

    </div>

    <hr>

    {#if editingBook}
        <div class="content" on:change={saveBook}>
            <div class="section top">
                <button class="component normal clear back" on:click={closeLorebook}>{@html SVG.arrow}</button>
                <Heading 
                    title={editingBook && editingBook.name ? editingBook.name : "Lorebook entry"} 
                    description="Currently editing" 
                    reverse={true} 
                    scale={1.2}
                />
                <button class="component danger remove" on:click={() => removeLorebook(editingBook)}>{@html SVG.trashcan}</button>
            </div>

            <Book book={editingBook}/>
        </div>

    {:else}
        <div class="section">

            <div class="section horizontal wide wrap">
                <div class="grow"><Heading title="Collection" description="Manage your installed lorebooks"/></div>
                <div class="buttons">
                    <button class="component confirm" on:click={addLorebook}>{@html SVG.plus}Create lorebook</button>
                    <button class="component normal" on:click={loadLorebooks}>{@html SVG.refresh}Refresh</button>
                </div>
            </div>
            
            {#if loading}
                <div class="loading">
                    <Loading/>
                </div>
            {:else}
                <Search
                    bind:elements={$currentLorebooks}
                    bind:results={searchResults}
                    placeholder="Search lorebooks..."
                    item={(item) => item.name.toLowerCase()}
                    sort={sortLorebooks}
                />

                <div style="height: 16px"/>

                {#if searchResults && searchResults.length > 0}
                    <div class="books">
                        {#each searchResults as book}
                            <button class="component normal wide book ellipsis" on:click={() => editLorebook(book)}>
                                <div class="background accent disabled">{@html SVG.book}</div>
                                <div class="title ellipsis">{book.name}</div>
                                <div class="description">{book.description ? book.description : "No description"}</div>
                                <div class="info">{`${book.entries.length} ${book.entries.length === 1 ? "entry" : "entries"}`}</div>
                            </button>
                        {/each}
                    </div>
                {:else}
                    <div class="empty explanation">No lorebooks found.</div>
                {/if}
            {/if}

        </div>
    {/if}

</div>

<style>
    hr{
        opacity: 0.1;
        width: 100%;
        border: 1px dashed gray;
        margin: 0px;
    }

    .content{
        display: flex;
        flex-direction: column;
        gap: 32px;
        box-sizing: border-box;
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

    .back :global(svg){
        width: 24px;
        height: 24px;
    }

    .buttons{
        display: flex;
        flex-wrap: wrap;
        flex-direction: row;
        margin-right: auto;
        gap: 8px;
    }

    .buttons button{
        margin-left:auto; 
        align-self: flex-end; 
        height: 30px;
    }

    button.remove{
        width: 100%;
        height: fit-content;
        padding: 0px;
        place-items: center;
        place-content: center;
    }

    .loading{
        display: flex;
        place-items: center;
        place-content: center;
        width: 100%;
        height: 128px;
    }

    .books{
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }

    .book{
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: flex-start;
        justify-content: flex-start;
        padding: 12px 16px;
        box-shadow: 0px 2px 2px 1px #00000040;
    }

    .book .background{
        opacity: 0.05;
    }

    .book .background :global(svg){
        position: absolute;
        right: 8px;
        bottom: -8px;
        width: 72px;
        height: 72px;
    }
    
    .book div{
        line-height: 1em;
        text-align: left;
        width: 100%;
    }

    .book .title{
        font-size: 1.1em;
    }

    .book .description{
        font-size: 1em;
        color: gray;
        font-style: italic;
        white-space: break-spaces;
    }

    .empty{
        width: 100%;
        height: 72px;
        display: flex;
        place-items: center;
        place-content: center;
        font-style: italic;
    }
</style>