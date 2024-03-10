<script lang="ts">
    
    // components
    import Browse from './Browse.svelte'
    import Editing from './Editing.svelte';
    import Options from './Options.svelte';
    import Header from './Header.svelte'
    import Chat from './Chat.svelte';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { swipe } from 'svelte-gestures';
    import { connected, currentCharacter, currentChat, currentTheme, fetching, sectionCharacters } from '../State';
    import Loading from '../components/Loading.svelte';
    import * as Server from '../modules/Server.svelte';
    import * as Theme from '../modules/Theme.svelte';

    onMount(() => {
        Theme.updateRatio()
        Theme.loadTheme()
        Server.initializeData()
    });

    function swipeHandler(event : CustomEvent) {
        console.log(event.detail.direction)
        switch(event.detail.direction){
            case "right":
                if( !$sectionCharacters ){
                    $sectionCharacters = true;
                    return;
                }
                break;

            case "left":
                if( $sectionCharacters ){
                    $sectionCharacters = false;
                    return;
                }
                break;

            default:
                break;
        }
    }

</script>

<svelte:window on:resize={Theme.updateRatio}/>

{#if $connected }
    <div class="fullscreen" use:swipe={{ timeframe: 300, minSwipeDistance: 100, touchAction: 'pan-y' }} on:swipe={swipeHandler}>
        {#if !$fetching}
            {#if $currentCharacter && $currentChat}
                <Chat/>
            {/if}
        {:else}
            <div class="fullscreen center loading" transition:fade={{duration:100}}>
                <Loading width={48} height={48}/>
            </div>
        {/if}
        <Browse/>
        <Editing/>
        <Options/>
        <Header/>
    </div>

{:else}
    <div class="fullscreen center loading" transition:fade={{duration:125}}>
        {#if $connected === null }
            <Loading width={48} height={48}/>
            Retrieving data from server...
        {:else}
            Cannot connect to server.
            <button class="component" on:click={ ()=> Server.initializeData() }>Retry</button>
        {/if}
    </div>
{/if}



<style>
    .loading{
        gap: 8px;
        flex-direction: column;
    }
</style>