<script lang="ts">
    import DOMPurify from 'dompurify';
    import 'highlight.js/styles/github-dark-dimmed.css';

    import { marked } from 'marked';
    import { addToggleableBlocks } from "@/utils/ToggleableBlock";

    import type { IChat } from "@shared/types";
    import * as Format from "@shared/format.ts";

    export let author : string = ""
    export let content : string = ""
    export let reasoning : string = ""

    export let user : string
    export let bot : string
    export let chat : IChat

    let displayReasoning = ""
    let displayText = ""

    $: {
        if( reasoning ){
            let html = marked.parse(reasoning)
            displayReasoning = DOMPurify.sanitize( html )
            displayReasoning = `<thinking>${displayReasoning}</thinking>`
        }else{
            displayReasoning = ""
        }

        if( content ){
            let html = marked.parse(content)
            html = Format.parseMacros( html, chat )
            html = Format.parseNames( html, user, bot )
            displayText = DOMPurify.sanitize( html )
        }else{
            displayText = ""
        }
    }
</script>

{#if displayReasoning}
    <div class="text grow" use:addToggleableBlocks={{name: `Reasoning`, content: displayReasoning}}>{@html displayReasoning}</div>
{/if}
<div class="text grow" use:addToggleableBlocks={{name: `${author}'s thoughts`, content: displayText}}>{@html displayText}</div>


<style>
    .text{
        display: flex;
        flex-direction: column;
        white-space: normal;
        gap: 1em;
        color: var( --content-primary-300 );
    }

    .text :global(h1), .text :global(h2), .text :global(h3), .text :global(h4), .text :global(h5), .text :global(h6){
        line-height: 1em;
    }

    .text :global(*){
        margin: 0px;
        text-align: start;
    }

    .text :global(em){
        color: var( --content-secondary-200 );
    }

    .text :global(code){
        font-size: 0.8em;
        background: var( --code-color-background );
    }

    .text :global(p){
        display: inline;
        flex-direction: column;
        box-sizing: border-box;
    }

    .text :global(pre){
        white-space: pre-wrap;
        color: var( --code-color-block );
        background: var( --code-color-background );
        border-radius: 6px;
        padding: 8px 12px;
        line-height: 1.2em;
    }

    .text :global(p code), .text :global(li code), .text :global(td code){
        white-space: pre-wrap;
        border-radius: 5px;
        padding: 2px 4px;
        line-height: 1.2em;
        color: var( --code-color-inline );
    }

    .text :global(th){
        font-size: 80%;
        background: var( --surface-neutral-300 );
    }

    .text :global(td){
        font-size: 90%;
        background: var( --background-neutral-200 );
        vertical-align: top;
    }

    .text :global(td), .text :global(th){
        width: max-content;
        word-break: keep-all;
        min-width: 0px;
        padding: 6px 12px;
        border: 2px solid var( --background-neutral-500 );
    }

    .text :global(table){
        border-collapse: collapse;
        max-width: 100%;
        table-layout: auto;
    }

    .text :global(img){
        max-width: 100%;
    }

    .text :global(blockquote){
        border-left: 4px solid var( --content-primary-200 );
        padding-left: 1em;
    }

    .text :global(div.error){
        display: flex;
        flex-direction: column;
        border: 1px solid;
        border-radius: 8px;
        padding: 16px 16px;
        margin: 4px 0px;
        overflow: hidden;
        position: relative;

        color: var( --content-danger-300 );
        border-color: var( --content-danger-300 );
        background-color: var( --content-danger-100 );

        --stripe-width: 4px;
        --stripe-height: 6px;
        --stripe-cycle: calc( var(--stripe-width) * 2 );
        --stripe-distance: calc( var(--stripe-width) * sqrt(2) * -2);
    }

    .text :global(div.error .type){
        font-weight: bold;
        font-size: 85%;
    }

    .text :global(div.error::before),
    .text :global(div.error::after){
        background: repeating-linear-gradient(
            -45deg,
            var( --content-danger-200) 0px,
            var( --content-danger-200) var(--stripe-width),
            transparent var(--stripe-width),
            transparent var(--stripe-cycle)
        );
        content: '';
        position: absolute;
        left: 0;
        width: 200%;
        height: var(--stripe-height);
        animation: scroll 1s linear infinite;
    }

    .text :global(div.error::before){
        top: 0px;
    }

    .text :global(div.error::after){
        bottom: 0px;
    }

    @keyframes scroll {
      0% {
        transform: translateX(-50%);
      }
      100% {
        transform: translateX(calc(-50% - var(--stripe-distance)));
      }
    }

    .text :global(.quote){
        font-style: italic;
    }

    .text :global(.thinking){
        position: relative;
        width: fit-content;
        display: flex;
        flex-direction: column;
        white-space: normal;
        gap: 4px;
        padding: 10px 16px;
        border-radius: 6px;
        color: var( --content-secondary-300 );
        background: color-mix(in srgb, var( --content-secondary-100 ) 10%, transparent 100%);
        border: 1px dashed color-mix(in srgb, var( --content-secondary-100 ) 25%, transparent 100%);
        user-select: text;
    }

    .text :global(.thinking ul){
        margin: 0px;
        padding-left: 2em;
        line-height: 1.5em;
    }

    .text :global(.thinking svg){
        width: 12px;
        height: 12px;
    }

    .text :global(.thinking button){
        inset: 0px;
        padding: 0px;
    }

    .text :global(.thinking .heading){
        display: flex;
        font-style: italic;
        flex-direction: row;
        align-items: center;
        gap: 4px;
        width: 100%;
    }

    .text :global(.thinking .content){
        display: none;
    }

    .text :global(.thinking.active .content){
        display: unset;
    }
</style>