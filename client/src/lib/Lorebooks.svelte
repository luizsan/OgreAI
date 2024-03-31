<script lang="ts">
    import { tick, onMount } from "svelte";
    import Heading from "../components/Heading.svelte"
    import Book from "../components/Book.svelte"
    import Loading from "../components/Loading.svelte";
    import Tags from "../components/Tags.svelte";
    import Search from "../components/Search.svelte";
    import { editing, currentCharacter, currentLorebooks, currentSettingsMain } from "../State"
    import * as Format from "../Format"
    import * as Server from "../modules/Server.svelte";
    import * as Data from "../modules/Data.svelte"
    import * as SVG from "../utils/SVGCollection.svelte"


    let editingBook : any = null;
    let searchResults : Array<ILorebook> = [];
    let selectedBooks : Array<ILorebook> = [];
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
            let book : any = createLorebook()
            book.name = name
            book.temp = { filepath: `${Format.toFilename(book.name)}-${new Date().getTime()}.json` }
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

    async function applyLorebook(book : ILorebook){
        if(!$currentCharacter){
            return
        }

        const ok = confirm("Are you sure you want to apply this lorebook to the current character?\nAny existing lorebook embedded in the character will be overwritten.\nThis action cannot be undone.")
        if( ok ){
            let copy = JSON.parse(JSON.stringify(book))
            $currentCharacter.data.character_book = copy;
            $currentCharacter = $currentCharacter
            if($editing){
                $editing.data.character_book = copy
                $editing = $editing
            }
            await Server.request("/save_character", { character: $currentCharacter })
        }
    }

    async function removeLorebook(book : ILorebook){
        const ok = confirm("Are you sure you want to delete this lorebook?\nThis action cannot be undone.")
        if( ok ){
            let result = await Server.request("/delete_lorebook", { book: book })
            if( result ){
                await loadLorebooks();
                await saveGlobals();
                closeLorebook();
            }
        }
    }

    async function loadLorebooks(){
        loading = true;
        await Server.request("/get_lorebooks").then(data => {
            $currentLorebooks = data;
            searchResults = $currentLorebooks
            searchResults.sort(sortLorebooks)
            searchResults = searchResults
            updateSelected()
            loading = false;
        })
    }

    async function saveBook(){
        await tick()
        await Server.request("/save_lorebook", { book: editingBook })
    }

    async function saveGlobals(){
        updateSelected()
        await Server.request("/save_main_settings", { data: $currentSettingsMain })
    } 

    function sortLorebooks(a,b){
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA < nameB) { return -1; }
        if (nameA > nameB) { return 1; }
        return 0;
    }

    function initializeSelected(){
        selectedBooks = $currentSettingsMain.books.map(
            (entry : string) => $currentLorebooks.find(book => book?.temp?.filepath == entry)
        )
        selectedBooks = selectedBooks.filter(item => item)
        selectedBooks = selectedBooks
    }

    function updateSelected(){
        const updated = selectedBooks.map((book : any) => book?.temp?.filepath ?? undefined)
        selectedBooks = selectedBooks
        $currentSettingsMain.books = updated.filter(item => item)
        $currentSettingsMain = $currentSettingsMain;
        return updated
    }

    function exportLorebook(book){
        let exported = JSON.stringify(book, null, 2)
        let name = book.temp?.filepath || book.name || "exported_lorebook"
        if( !name.endsWith(".json") ){
            name += ".json"
        }
        Data.download(exported, `${name}`)
    }

    function importLorebook(){
        Data.upload(async (data) => {
            let imported = JSON.parse(data)
            if(!imported)
                return
            let ok = await Server.request("/save_lorebook", { book: imported })
            if(ok){
                $currentLorebooks.push(imported)
                $currentLorebooks = $currentLorebooks
                searchResults = $currentLorebooks
                searchResults.sort(sortLorebooks)
                searchResults = searchResults
                updateSelected()
            }
        })
    }

    onMount(() => {
        initializeSelected()
    })

</script>

<div class="content wide">
    
    <div class="section" on:change={saveGlobals}>
        <Heading
            title="Global Lorebooks"
            description={`These lorebooks are enabled globally for all chats and will be inserted in the prompt as 'World Info'.`}
        />

        <Tags
            bind:choices={$currentLorebooks}
            bind:selected={selectedBooks}
            placeholder="Add lorebooks..."
            notFound="No lorebooks found matching search criteria"
            display={(v) => v.name}
            item={(v) => v.temp?.filepath || v.name }
        />

    </div>

    <div class="section horizontal wide wrap data">
        <hr class="component">
        {#if !editingBook}
        <button class="component" on:click={importLorebook}>{@html SVG.download} Import Lorebook</button>
        <button class="component confirm" on:click={addLorebook}>{@html SVG.plus}Create lorebook</button>
        {/if}
    </div>

    {#if editingBook}
        <div class="content" on:change={saveBook}>
            <div class="section horizontal wide wrap">
                <div class="top">
                    <button class="component normal clear back" on:click={closeLorebook}>{@html SVG.arrow}</button>
                    <Heading 
                        title={editingBook && editingBook.name ? editingBook.name : "Lorebook entry"} 
                        description={editingBook.temp?.filepath || "Currently editing"}
                        reverse={true} 
                        scale={1.2}
                    />
                </div>
                
                <div class="buttons">
                    {#if $currentCharacter}
                        <button class="component info" on:click={() => applyLorebook(editingBook)}>{@html SVG.copy} Copy to character</button>
                    {/if}
                    <button class="component normal" on:click={() => exportLorebook(editingBook)}>{@html SVG.upload} Export</button>
                    <button class="component danger" on:click={() => removeLorebook(editingBook)}>{@html SVG.trashcan} Delete</button>
                </div>
            </div>
            <Book bind:book={editingBook}/>
        </div>

    {:else}
        <div class="section">

            <div class="section horizontal wide wrap">
                <div class="grow"><Heading title="Local Collection" description="Create, delete and edit your installed lorebooks."/></div>
                <div class="buttons">
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
                                <div class="background normal disabled">{@html SVG.book}</div>
                                <div class="title ellipsis">{book.name}</div>
                                <div class="description">{book.description ? book.description : "No description"}</div>
                                <div class="info disabled">{`${book.entries.length} ${book.entries.length === 1 ? "entry" : "entries"}`}</div>
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
        border-style: dashed;
    }

    .content{
        display: flex;
        flex-direction: column;
        gap: 32px;
        box-sizing: border-box;
    }

    .top{
        display: grid;
        grid-template-columns: 36px auto;
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

    .back{
        padding: 0px;
    }

    .back :global(svg){
        width: 24px;
        height: 24px;
    }

    .buttons{
        display: flex;
        flex-wrap: wrap;
        flex-direction: row;
        margin-left: auto;
        gap: 8px;
    }

    .buttons button{
        margin-left:auto; 
        align-self: flex-end; 
        height: 30px;
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
        right: -4px;
        bottom: -8px;
        width: 72px;
        height: 72px;
    }
    
    .book div{
        line-height: 1em;
        text-align: left;
        width: 100%;
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

    .data{
        justify-content: flex-end; 
        align-items: center;
        height: 30px;
        gap: 8px;
    }

    .data hr{
        flex: 1 1 content; 
        height: 0px;
        margin: 0px 16px;
    }
</style>