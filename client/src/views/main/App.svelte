<script lang="ts">
    import { marked } from 'marked';

    // components
    import Browse from '@/views/browse/Browse.svelte'
    import Editing from '@/views/character/Editing.svelte';
    import Options from '@/views/options/Tabs.svelte';
    import Header from './Header.svelte'
    import Chat from '@/views/chat/Chat.svelte';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';

    import {
        connected,
        currentTheme,
        currentPreferences,
        currentChat,
        fetching,
    } from '@/State';

    import Dialog from '@/components/Dialog.svelte';
    import Loading from '@/components/Loading.svelte';
    import * as Preferences from '@/modules/Preferences';
    import * as Theme from '@/modules/Theme';
    import * as Server from '@/Server';
    import Home from './Home.svelte';

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
        $currentPreferences = Preferences.loadAllPreferences()
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
        <Chat/>
        <Browse/>
        <Editing/>
        <Options/>
        <Header/>

        {#if $fetching}
            <div class="fullscreen center loading" transition:fade={{duration:100}}>
                <Loading width={48} height={48}/>
            </div>
        {/if}

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
    }
</style>