<script>
    import { characterList, creating, currentCharacter, currentChat, editing, fetching } from "../State";
    import Character from './Character.svelte'
    import * as SVG from "../utils/SVGCollection.svelte";
    import * as Server from "./Server.svelte";

    async function NewCharacter(){
        $fetching = true;
        await Server.request( "/new_character" ).then(data => {
            $creating = true;
            $editing = data;
            $editing.data.name = "New character"
            $editing.temp.tokens = {}
            $editing.temp.filepath = "./img/bot_default.png"
        });

        let tokens = await Server.getCharacterTokens($editing)
        $editing.temp.tokens = tokens;
        $fetching = false;
    }
</script>

{#if (!$currentCharacter || !$currentChat)}
    <div class="main" class:hidden={$fetching}>

        <input type="text" class="component" placeholder="Search characters...">

        <div class="buttons">
            <button class="component" title="New character" on:click={NewCharacter}>{@html SVG.add} Add character</button>
            <button class="component" title="Reload characters" on:click={Server.getCharacterList}>{@html SVG.refresh}Refresh list</button>
            <span style="margin-left: auto"></span>
            <label for="sort">Sort by:</label>
            <select name="sort" class="component">
                <option value="alphabetical">Alphabetical</option>
                <option value="created">Create date</option>
                <option value="last">Last interaction</option>
            </select>
        </div>

        <div class="list">
            {#each $characterList as char, i}
                <Character id={i} character={char} label={false} />
            {/each}
        </div>

    </div>
{/if}


<style>

    .main{
        position: absolute;
        left: 50%;
        top: var( --header-size );
        translate: -50% 0 0;
        display: flex;
        flex-direction: column;
        max-width: var( --chat-width );
        height: 100%;
        gap: 20px;
        justify-content: center;
    }

    .buttons{
        display: flex;
        flex-direction: row;
        gap: 8px;
        justify-content: center;
    }

    .list{
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 16px;
        padding: 12px;
        top: var( --header-size );
        left: 0px;
        height: fit-content;
        overflow-x: hidden;
        overflow-y: scroll;
        scrollbar-width: none;
        
        justify-content: center;
        transition: translate 0.15s ease;
    }

    button.component :global(svg){
        width: 16px;
        height: 16px;
    }

</style>