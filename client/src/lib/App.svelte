<script lang="ts">
    
    // components
    import Browse from './Browse.svelte'
    import Editing from './Editing.svelte';
    import Options from './Options.svelte';
    import Header from './Header.svelte'
    import * as Server from './Server.svelte';
    import { onMount } from 'svelte';
    import { TEST_STORE, connected, currentCharacter, currentChat, fetching, sectionCharacters } from '../State';
    import { fade } from 'svelte/transition';
    import { swipe } from 'svelte-gestures';
    import Chat from './Chat.svelte';
    import Loading from '../components/Loading.svelte';
    import Preset from '../components/Preset.svelte';
    import Prompt from '../components/Prompt.svelte';

    onMount(() => {
        LoadTheme()
        Server.initializeData()
    });

    function LoadTheme(){
        let t = window.localStorage.getItem("theme")
        if( t === "light" || t === "dark" ){
            document.body.classList.add(t === "light" || t === "dark" ? t : "dark")
        }
    }
    
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

    $TEST_STORE = [ 
        { key: "base_prompt", enabled: true, content: "ogey" }, 
        { key: "description", enabled: true, content: "" }, 
        { key: "scenario", enabled: true, content: "" }, 
        { key: "personality", enabled: true, content: "" },
        { key: "persona", enabled: true, content: "" }, 
        { key: "mes_example", enabled: true, content: "" }, 
        { key: "messages", enabled: true }, 
        { key: "sub_prompt", enabled: true, content: "rrat" }, 
        { key: "prefill_prompt", enabled: true, content: "" }, 
    ]
    let debug = false
</script>


{#if debug}
    <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px;">
    <Preset elements={[]}/>

    <Prompt 
        list={$TEST_STORE} 
        update={(v) => $TEST_STORE = v}
    />

    </div>
    <div style="font-size: 90%; width: 100%">{JSON.stringify($TEST_STORE)}</div>
{:else}
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
{/if}


<style>
    .loading{
        gap: 8px;
        flex-direction: column;
    }
</style>