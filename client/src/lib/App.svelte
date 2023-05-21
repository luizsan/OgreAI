<script lang="ts">
    
    // components
    import Chat from '@/lib/Chat.svelte'
    import Sidebar from '@/lib/Sidebar.svelte'
    import Editing from '@/lib/Editing.svelte';
    import Options from '@/lib/Options.svelte';
    import Header from '@/lib/Header.svelte'
    import Loading from '@/components/Loading.svelte';
    import * as Server from '@/lib/Server.svelte';
    import { onMount } from 'svelte';
    import { connected, currentCharacter, currentChat, fetching, sectionCharacters } from '@/State';
    import { fade } from 'svelte/transition';
    import { swipe } from 'svelte-gestures';

    onMount(() => {
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
        // _target = event.detail.target;
    }
    
</script>


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
        <Sidebar/>
        <Editing/>
        <Options/>
    </div>
    <Header/>
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