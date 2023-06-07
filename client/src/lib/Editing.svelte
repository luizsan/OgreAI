<script lang="ts">
    import { characterList, creating, currentCharacter, currentChat, editing, fetching, localServer } from "../State";
    import { close } from "../utils/SVGCollection.svelte";
    import Screen from "../components/Screen.svelte";
    import * as Server from "./Server.svelte"
    
    let uploadInput : HTMLInputElement;
    let uploadedURL : string = null;

    let tokens = {}
    let total = 0;
    let percent = {}
    let breakdown = []
    let distribution = "";

    let avatar = "";

    $: {
        if( $editing ){
            if( $editing.metadata.tokens ){
                tokens = $editing.metadata.tokens
            
                total = 0;
                percent = {};
                breakdown = [];
                distribution = "";

                if( $editing && $editing.metadata.tokens ){
                    Object.keys(tokens).forEach( key =>{
                        total += tokens[key]
                    });
                    
                    Object.keys(tokens).forEach( key => {
                        let k = key.charAt(0).toUpperCase() + key.slice(1)
                        percent[key] = tokens[key] / total * 100
                        breakdown.push( `${tokens[key]} ${k} (${percent[key].toFixed(2)}%)` )
                        distribution += `${percent[key]}% `
                    })
                }
            }
            refreshAvatar();
        }
    }

    async function CreateCharacter(){
        if( $creating ){
            if( !$editing.name || $editing.name.length < 1 ){
                alert( "Cannot create character:\nInvalid or empty name")
                return
            }
        }
        ApplyChanges();
    }

    async function SaveCharacter(){
        if( !$creating ){
            ApplyChanges();
        }
    }

    async function ApplyChanges(){
        $fetching = true
        $editing.last_changed = Date.now()

        const formData = new FormData();
        const fileName = $creating ? $editing.name + "-" + Date.now() : $editing.metadata.filepath
        formData.append("file", uploadInput.files[0])
        formData.append("character", JSON.stringify( $editing ))
        formData.append("filepath", fileName)

        if( $creating ){
            formData.append("creating", "true" )
        }

        let result = await fetch( localServer + "/save_character", {
            method: "POST",
            body: formData
        })

        if( result ){
            if( $creating ){
                await Server.getCharacterList();
                $editing = null;
                $creating = null;
                alert(result)
            }else{
                if( $editing && $editing.metadata.avatar ){
                    let edited = await Server.request("/get_character", { 
                        filepath: $editing.metadata.filepath 
                    });

                    $currentCharacter = edited;
                    $editing = edited;

                    // update item on list
                    for( let i = 0; i < $characterList.length; i++ ){
                        if( $characterList[i].metadata.filepath == $editing.metadata.filepath){
                            $characterList[i] = edited;
                        }
                    }

                    await refreshTokens();
                    if( $currentChat ){
                        $currentChat.participants[0] = edited.name
                    }

                    refreshAvatar();
                    avatar = avatar;
                }
            }
        }

        $fetching = false
    }

    async function DeleteCharacter(){
        if( $editing && window.confirm("Are you sure you want to delete this character?\nThis action is irreversible!")){
            if( $editing.metadata.filepath === $currentCharacter.metadata.filepath ){
                $currentCharacter = null;
                $currentChat = null;
            }

            let result = await Server.request("/delete_character", {
                filepath: $editing.metadata.filepath
            })
            
            if( result ){
                await Server.getCharacterList();
                if( $currentCharacter == $editing ){
                    $currentCharacter = null;
                }
                $editing = null;
            }
        }
    }

    async function refreshTokens(){
        let tokens = await Server.getCharacterTokens( $editing )
        $editing.metadata.tokens = tokens;
        console.log(tokens)
    }

    function SetUploadImage(){
        if( !uploadInput.files ){
            return;
        }

        if( uploadedURL ){
            URL.revokeObjectURL(uploadedURL)
        }
        uploadedURL = URL.createObjectURL(uploadInput.files[0])
        $editing.metadata.avatar = uploadedURL
        refreshAvatar();
    }

    function refreshAvatar(){
        if( $creating && $editing.metadata.avatar ){
            avatar = $editing.metadata.avatar;
        }else{
            avatar = `${localServer + "/" + $editing.metadata.filepath.replace("../", "")}?${$editing.last_changed}`
            avatar = avatar.replaceAll("\\", "/")
        }
    }

    function Close(){
        $editing = null;
    }
</script>


{#if $editing }
    <Screen>
        <div class="top" on:change={SaveCharacter} >
            <div class="avatar">
                <img src={avatar} alt=""/>
                <button class="upload" on:click={() => uploadInput.click()}>{("Change Avatar").toUpperCase()}</button>
                <form action="/save_character" enctype="multipart/form-data" method="post">
                    <input name="file" type="file" bind:this={uploadInput} bind:value={$editing.metadata.avatar} on:change={SetUploadImage}>
                </form>
            </div>

            <div class="header">
                <p class="explanation">Currently editing</p>
                <h1 class="title" style="font-size: 120%">{$editing.name}</h1>
                <div class="tokens" title={breakdown.join("\n")}>
                    <div class="label"><strong>{total}</strong> Tokens</div>
                    <div class="meter" style="grid-template-columns:{distribution}">
                        {#each Object.keys(tokens) as type}
                            <div class={type}></div>
                        {/each}
                    </div>
                </div>
            </div>
            <button class="close normal" on:click={Close}>{@html close}</button>
        </div>

        <div class="bottom" on:input={refreshTokens} on:change={SaveCharacter}>
            <div class="section wide">
                <div>
                    <h3 class="title">Character name</h3>
                    <p class="explanation">The name of the character displayed in chat.</p>
                </div>
                <input type="text" class="component wide" bind:value={$editing.name}>
            </div>
            
            <div class="section wide">
                <div>
                    <h3 class="title">Greeting</h3>
                    <p class="explanation">The character will start a chat with this message.</p>
                </div>
                <textarea class="component wide" rows=6 bind:value={$editing.greeting}></textarea>
            </div>

            <div class="section wide description">
                <div>
                    <h3 class="title">Description</h3>
                    <p class="explanation">Description of personality and other characteristics.</p>
                </div>
                <textarea class="component wide" rows=9 bind:value={$editing.description}></textarea>
            </div>
            
            <div class="section wide personality">
                <div>
                    <h3 class="title">Personality</h3>
                    <p class="explanation">A brief description of the personality.</p>
                </div>
                <textarea class="component wide" rows=3 bind:value={$editing.personality}></textarea>
            </div>
            
            <div class="section wide scenario">
                <div>
                    <h3 class="title">Scenario</h3>
                    <p class="explanation">Circumstances and context of the dialogue.</p>
                </div>
                <textarea class="component wide" rows=3 bind:value={$editing.scenario}></textarea>
            </div>
            
            <div class="section wide dialogue">
                <div>
                    <h3 class="title">Example dialogue</h3>
                    <p class="explanation">Forms a personality more clearly.</p>
                </div>
                <textarea class="component wide" rows=6 bind:value={$editing.dialogue}></textarea>
            </div>

            <div class="wide horizontal">
                {#if $creating}
                    <button class="component confirm" on:click={CreateCharacter}>Create Character</button>
                {:else}
                    <button class="component danger" on:click={DeleteCharacter}>Delete Character</button>
                {/if}
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
        position: relative;
        align-self: center;
    }

    .avatar img{
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        pointer-events: none;
        object-fit: cover;
        
    }

    .avatar button{
        position: absolute;
        inset: 0px;
        border-radius: 50%;
        background: hsla(0, 0%, 25%, 0.8);
        opacity: 0;
        font-weight: bolder;
        font-family: var( --default-font-face );
        font-size: 70%;
        color: white;
        outline: 1px solid white;
    }
    
    .avatar button:hover{
        opacity: 1;
    }

    .avatar input[type="file"]{
        position: absolute;
        inset: 0px;
        visibility: hidden;
    }

    .close{
        height: 32px;
        position: absolute;
        right: 8px;
        top: 16px;
        width: 32px;
    }

    .top{
        background: hsl(0, 0%, 15%);
        border-bottom: 1px solid hsla(0, 0%, 50%, 0.5);
        display: grid;
        gap: 16px;
        box-shadow: 0px 20px 20px -20px #00000040;
        grid-template-columns: min-content auto;
        padding: 16px 48px 16px 20px;
        position: sticky;
        top: 0px;
        z-index: 1;
    }

    
    @media (prefers-color-scheme: light){
        .top{
            background: hsl(0, 0%, 85%);
        }
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

    .horizontal{
        display: flex;
        gap: 16px;
        justify-content: center;
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
        display: grid;
        height: 6px;
        margin: 4px 0px;
        max-width: 340px;
    }

    .meter div{
        background: hsl(0, 0%, 50%);
        height: 100%;
    }

    .label{
        font-size: 85%;
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