<script lang="ts">
    import { marked } from 'marked';

    // svelte
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';

    // components
    import Browse from '@/views/browse/Browse.svelte'
    import Editing from '@/views/character/Editing.svelte';
    import History from '@/views/history/History.svelte';
    import Options from '@/views/options/Tabs.svelte';
    import Header from '@/views/main/Header.svelte'
    import Chat from '@/views/chat/Chat.svelte';

    import {
        connected,
        currentTheme,
        currentPreferences,
        currentChat,
        fetching,
        history,
    } from '@/State';

    import Dialog from '@/views/modal/Dialog.svelte';
    import Actions from '@/views/modal/Actions.svelte';
    import Loading from '@/components/Loading.svelte';
    import Screen from '@/components/Screen.svelte';

    import * as Prefs from '@/modules/Preferences';
    import * as Theme from '@/modules/Theme';
    import * as Server from '@/Server';

    function initializeMarked(){
        const quotePattern = /(&quot;|")([^"]+?)(\1)/gi
        const marked_renderer = new marked.Renderer();

        marked_renderer.del = function(text : string){
            return "~" + text + "~"
        }
        marked_renderer.text = function(text : string){
            text = text.replaceAll("<", "&lt;")
            text = text.replaceAll(">", "&gt;")
            text = text.replace(quotePattern, `<span class="quote">"$2"</span>`)
            return text;
        }

        marked.setOptions({
            breaks: true,
            renderer: marked_renderer,
        })
    }

    onMount(async () => {
        Theme.updateRatio()
        $currentTheme = Theme.loadTheme()
        $currentPreferences = Prefs.loadAllPreferences()
        initializeMarked()
        await Server.initializeData()
        if( $currentPreferences["load_last_chat"] ){
            await Server.loadLastChat()
        }
    });


    const confirmationMessage = 'Are you sure you want to leave this page?';

    function confirmExit(e : BeforeUnloadEvent){
        if(!$currentChat) return;
        e.preventDefault();
        e.returnValue = "";
        (e || window.event).returnValue = confirmationMessage;
        return confirmationMessage;
    }
</script>

<svelte:window on:resize={Theme.updateRatio} on:beforeunload={confirmExit}/>

{#if $connected }
    <div class="fullscreen" style="--chat-width: {$currentPreferences["content_width"] ?? 900}px">
        <div class="main">
            <div class="sidebar">
                <Browse/>
            </div>
            <div class="middle">
                {#if $history}
                    <History/>
                {:else}
                    <Chat/>
                    <Editing/>
                {/if}
            </div>
            <div class="sidebar">
                <Options/>
            </div>
        </div>
        <Header/>
        {#if $fetching}
            <div class="fullscreen center loading" transition:fade={{duration:100}}>
                <Screen/>
                <div style="z-index: 2000">
                <Loading width={48} height={48}/>
                </div>
            </div>
        {/if}

        <Actions/>
        <Dialog/>
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
        z-index: 1000;
    }

    .main{
        display: grid;
        position: absolute;
        top: var( --header-size );
        left: 0px;
        right: 0px;
        bottom: 0px;
        justify-content: center;
        grid-template-columns: auto 1fr auto;
    }

    .middle{
        position: relative;
        inset: 0px;
        display: flex;
    }

    .sidebar{
        height: 100%;
        min-width: 0px;
        overflow-x: hidden;
        overflow-y: auto;
    }
</style>