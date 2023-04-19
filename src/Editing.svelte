<script>
    import { editing, sectionCharacters, currentCharacter } from "./State";
    import { fade } from 'svelte/transition';
    import { close, trashcan } from "./utils/SVGCollection.svelte";
    import Screen from "./Screen.svelte";

    let tokens = {
        description: 292,
        personality: 49,
        scenario: 99,
        dialogue: 14,
    }

    $: total = tokens.description + tokens.personality + tokens.scenario + tokens.dialogue

    $: percent = {
        description: tokens.description / total * 100,
        personality: tokens.personality / total * 100,
        scenario: tokens.scenario / total * 100,
        dialogue: tokens.dialogue / total * 100,
    }

    $: breakdown = [
        `${tokens.description} Description (${percent.description.toFixed(2)}%)`,
        `${tokens.personality} Personality (${percent.personality.toFixed(2)}%)`,
        `${tokens.scenario} Scenario (${percent.scenario.toFixed(2)}%)`,
        `${tokens.dialogue} Dialogue (${percent.dialogue.toFixed(2)}%)`,
    ]

    $: distribution = `${percent.description}% ${percent.personality}% ${percent.scenario}% ${percent.dialogue}%`

    function Close(){
        $editing = false;
    }
</script>

{#if $currentCharacter != null && $editing }
    <Screen>
        <div class="top">
            <div class="avatar" style="background-image: url({encodeURIComponent($currentCharacter.metadata.filepath)})">
                <button></button>
            
            </div>
            <div class="header">
                <p class="explanation">Currently editing</p>
                <h1 class="title" style="font-size: 120%">{$currentCharacter.name}</h1>
                <div class="tokens" title={breakdown.join("\n")}>
                    <div class="label">{total} Tokens</div>
                    <div class="meter" style="grid-template-columns:{distribution}">
                        <div class="description"></div>
                        <div class="personality"></div>
                        <div class="scenario"></div>
                        <div class="dialogue"></div>
                    </div>
                </div>
            </div>
            <button class="close normal" on:click={Close}>{@html close}</button>
        </div>

        <div class="bottom">
            <div class="section">
                <h3 class="title">Character name</h3>
                <p class="explanation">The name of the character displayed in chat.</p>
                <input type="text" class="component" bind:value={$currentCharacter.name}>
            </div>
            
            <div class="section">
                <h3 class="title">Greeting</h3>
                <p class="explanation">The character will start a chat with this message.</p>
                <textarea class="component" rows=6>{$currentCharacter.greeting}</textarea>
            </div>

            <div class="section description">
                <h3 class="title">Description</h3>
                <p class="explanation">Description of personality and other characteristics.</p>
                <textarea class="component" rows=12>{$currentCharacter.description}</textarea>
            </div>
            
            <div class="section personality">
                <h3 class="title">Personality</h3>
                <p class="explanation">A brief description of the personality.</p>
                <textarea class="component" rows=3>{$currentCharacter.personality}</textarea>
            </div>
            
            <div class="section scenario">
                <h3 class="title">Scenario</h3>
                <p class="explanation">Circumstances and context of the dialogue.</p>
                <textarea class="component" rows=3>{$currentCharacter.scenario}</textarea>
            </div>
            
            <div class="section dialogue">
                <h3 class="title">Example dialogue</h3>
                <p class="explanation">Forms a personality more clearly.</p>
                <textarea class="component" rows=6>{$currentCharacter.dialogue}</textarea>
            </div>

            <div class="section horizontal">
                <button class="component danger">Delete</button>
            </div>
        </div>
    </Screen>
{/if}

<style>
    p {
        margin: 0px;
    }

    .avatar{
        background-color: #00000080;
        background-position: center;
        background-size: cover;
        border-radius: 50%;
        float: left;
        height: 72px;
        width: 72px;
    }

    .avatar button{
        width: 100%;
        height: 100%;
    }
    
    .avatar button:hover{
        background: #ff000080;
    }

    .close{
        height: 32px;
        position: absolute;
        right: 8px;
        top: 16px;
        width: 32px;
    }

    .top{
        align-items: top;
        background: hsla(0, 0%, 15%, 1);
        border-bottom: 1px solid #ffffff16;
        display: grid;
        gap: 16px;
        grid-template-columns: min-content auto;
        padding: 16px 48px 16px 20px;
        position: sticky;
        top: 0px;
    }
    
    .bottom{
        display: flex;
        height: fit-content;
        flex-direction: column;
        gap: 32px;
        padding: 24px 20px;
        scrollbar-color: #303030 transparent;
        scrollbar-width: thin;
    }

    .section{
        width: 100%;
    }

    .title{
        font-weight: 600;
        margin: 0px;
    }

    .explanation{
        color: #606060;
        font-size: 85%;
    }

    .tokens{
        display: flex;
        flex-direction: column;
        margin-top: 4px;
    }

    .meter{
        border-radius: 2px;
        display: grid;
        height: 6px;
        margin: 4px 0px;
        max-width: 340px;
    }

    .meter div{
        height: 100%;
    }

    .label{
        color: hsl(0, 0%, 75%);
        font-size: 80%;
    }

    .meter .description{ background: royalblue; }
    .meter .personality{ background: mediumspringgreen; }
    .meter .scenario{ background: gold; }
    .meter .dialogue{ background: tomato; }
    
    .meter div{ margin-right: 2px; }

    .description textarea{ border-left-color: royalblue; }
    .personality textarea{ border-left-color: mediumspringgreen; }
    .scenario textarea{ border-left-color: gold; }
    .dialogue textarea{ border-left-color: tomato; }

</style>