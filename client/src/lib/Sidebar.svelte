<script>
    import { characterList, creating, editing, fetching, sectionCharacters } from "@/State";
    import Character from '@/lib/Character.svelte'
    import * as SVG from "@/utils/SVGCollection.svelte";
    import * as Server from "@/lib/Server.svelte";

    async function NewCharacter(){
        $fetching = true;
        await Server.request( "/new_character" ).then(data => {
            $creating = true;
            $editing = data;
            $editing.name = "New character"
            $editing.metadata.tokens = {}
            $editing.metadata.filepath = "./img/bot_default.png"
        });

        let tokens = await Server.getCharacterTokens($editing)
        $editing.metadata.tokens = tokens;
        $fetching = false;
    }

</script>


<div class:active={$sectionCharacters}>
    <button class="system" title="New character" on:click={NewCharacter}>{@html SVG.add}</button>
    <!-- <button class="system">{@html SVG.download}</button> -->
    <button class="system" title="Reload characters" on:click={Server.getCharacterList}>{@html SVG.refresh}</button>
    <hr>
    {#each $characterList as char, i}
        <Character id={i} character={char} />
    {/each}
</div>


<style>
    *::-webkit-scrollbar{
        width: 0px;
    }

    div{
        background: hsl(0, 0%, 15%);
        border-right: 1px solid hsl(0, 0%, 33%);
        bottom: 0px;
        box-shadow: 3px 0px transparent;
        display: flex;
        flex-direction: column;
        gap: 12px;
        top: var( --header-size );
        left: 0px;
        bottom: 0px;
        overflow-x: hidden;
        overflow-y: scroll;
        padding: 12px;
        position: fixed;
        scrollbar-width: none;
        width: fit-content;

        transition: translate 0.15s ease;
        translate: -100% 0 0;
    }

    hr{
        width: 75%;
        opacity: 0.25;
    }

    .active{
        translate: 0 0 0;
    }

    .system{
        background-color: hsl(0,0%,80%);
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
        border-radius: 50%;
        border: 1px solid white;
        box-shadow: 0px 0px 0px 0px transparent;
        min-height: var( --avatar-size );
        min-width: var( --avatar-size );
        outline: 0px solid white;
        padding: 0px;
        margin: 0px;
        transition: all 0.125s ease-out;
    }
    
    .system:hover{
        background-color: white;
        box-shadow: 0px 0px 8px 2px var( --accent-color-light);
        filter: brightness(1);
        outline: 4px solid var( --accent-color-normal);
    }

    .system :global(svg){
        width: 32px;
        height: 32px;
        place-self: center;
        color: hsl(0, 0%, 50%);
        transition: all 0.125s ease-out;
    }

    .system:hover :global(svg){
        color: var( --accent-color-light );
    }
</style>