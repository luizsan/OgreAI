<script lang="ts">
    
    // components
    import Chat from './Chat.svelte'
    import Sidebar from './Sidebar.svelte'
    import Editing from './Editing.svelte';
    import Settings from './Settings.svelte';
    import Header from './Header.svelte'
    import Loading from './Loading.svelte';
    import * as Server from './Server.svelte';
    import { onMount } from 'svelte';
    import { connected, api, sectionCharacters, sectionSettings } from './State';
    import { fade } from 'svelte/transition';
    import { swipe } from 'svelte-gestures';

    onMount(() => {
        Server.initializeData()
    });
    
    function swipeHandler(event) {
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
        // _target = event.detail.target;
    }
    
</script>


{#if $connected }
    <div class="bg" use:swipe={{ timeframe: 300, minSwipeDistance: 100, touchAction: 'pan-y' }} on:swipe={swipeHandler}>
        <Chat/>
        <Sidebar/>
        <Editing/>
        <Settings/>
    </div>
    <Header/>
{:else}
    <div class="loading" transition:fade={{duration:125}}>
        {#if $connected === null }
            <Loading width={48} height={48}/>
            Retrieving data from server...
        {:else}
            Cannot connect to server.
            <button on:click={ ()=> Server.initializeData() }>Retry</button>
        {/if}
    </div>
{/if}


<style>
    .bg{
        position: fixed;
        inset: 0px;
    }

    .loading{
        position: fixed;
        inset: 0px;
        display: flex;
        gap: 16px;
        flex-direction: column;
        place-content: center;
        place-items: center;
    }
</style>