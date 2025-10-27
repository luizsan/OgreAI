<script lang="ts">
    import { onDestroy } from "svelte";
    import { data, type DialogData } from "@/modules/Dialog.ts";


    let self: HTMLDialogElement
    let state: DialogData | null = null;
    let input: string = ""

    $: {
        if(self && state){
            self.showModal()
        }
    }

    const unsubscribe = data.subscribe(v => {
        state = v
        input = v?.type === "prompt" ? v.initial : "";
    })

    function close(result?: any): void{
        if( state?.resolve ){
            state.resolve(result)
        }
        self.close()
        $data = null
    }

    function selectContent(event : Event){
        const target = event.target as HTMLInputElement;
        if (!target) return;
        target.select();
    }

    onDestroy(unsubscribe)
</script>

{#if state}
<dialog class="light" bind:this={self}>
    <div class="header wide">{state.title}</div>
    <div class="body section">
        <div>{state.message}</div>
        <form class="section center">
            {#if state.type === "alert"}
                <div class="section horizontal wide center">
                    <button class="component normal choice" on:click={() => close()}>OK</button>
                </div>
            {:else if state.type === "confirm"}
                <div class="section horizontal wide end">
                    <button class="component normal choice" on:click={() => close(true)}>OK</button>
                    <button class="component normal choice" on:click={() => close(false)}>Cancel</button>
                </div>
            {:else if state.type === "prompt"}
                <!-- svelte-ignore a11y-autofocus -->
                <input class="component normal wide" autofocus type="text" bind:value={input} on:focus={selectContent} on:submit={() => close(input)}/>
                <div class="section horizontal wide end">
                    <button class="component normal choice" on:click={() => close(input)}>OK</button>
                    <button class="component normal choice" on:click={() => close(null)}>Cancel</button>
                </div>
            {/if}
        </form>
    </div>
</dialog>
{/if}


<style>
    dialog{
        inset: 32px;
        padding: 0px;
        border: none;
        border-radius: 8px;
        z-index: 1000;
        min-width: 360px;
        max-width: var( --chat-width );
        background: var( --surface-neutral-100 );
        color: var( --content-neutral-200 );
        overflow-x: hidden;
        overflow-y: hidden;
        font-family: var( --system-font-face );
        box-shadow: 0px 8px 24px 0px #00000080;
        border: 1px solid #00000030;
    }

    dialog::backdrop{
        background: hsla(0, 0%, 15%, 0.9);
        backdrop-filter: blur(2px);
    }

    input[type="text"]{
        font-family: var( --default-font-face );
        font-size: 14px;
    }

    .header{
        position: absolute;
        display: flex;
        place-items: center;
        width: 100%;
        height: 20px;
        padding: 4px 16px;
        font-size: 12px;
        background: white;
        z-index: 1;
    }

    .body {
        padding: 40px 24px 20px 24px;
        position: relative;
        display: flex;
        font-size: 12px;
        white-space: wrap;
        line-height: 1.3em;
        background: hsl(0, 0%, 85%);
        color: black;
    }

    .choice{
        font-family: var( --system-font-face );
        font-size: var( --system-font-size );
        padding: 0px 16px;
        min-width: 80px;
        min-height: 24px;
        box-shadow: none;
    }

    .section{
        gap: 12px;
    }

    .section.horizontal{
        gap: 8px;
    }

</style>