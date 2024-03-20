<script lang="ts">
    import Heading from "../components/Heading.svelte"
    import Book from "../components/Book.svelte"
    import Lore from "../components/Lore.svelte"
    import * as SVG from "../utils/SVGCollection.svelte"

    let currentBook : ILorebook = {
        
        entries: [],
    } as ILorebook;

    let editingBook : ILorebook = null;
</script>

<div class="content wide">
    
    <div class="section top">
        <button class="component normal clear back">{@html SVG.arrow}</button>
        <div>
            <p class="explanation">Currently editing</p>
            <p class="title">{ editingBook && editingBook.name ? editingBook.name : "Lorebook"}</p>
        </div>
    </div>

    <Book book={currentBook}/>
</div>

<style>
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
</style>