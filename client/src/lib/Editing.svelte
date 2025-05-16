<script lang="ts">
    import { characterList, creating, currentProfile, currentCharacter, currentChat, currentLorebooks, editing, fetching, localServer } from "../State";
    import Screen from "../components/Screen.svelte";
    import Accordion from "../components/Accordion.svelte";
    import Footer from "../components/Footer.svelte";
    import Heading from "../components/Heading.svelte";
    import Book from "../components/Book.svelte";
    import * as Server from "../modules/Server.svelte"
    import * as SVG from "../utils/SVGCollection.svelte";
    import * as Format from "@shared/format.ts";

    let uploadInput : HTMLInputElement;
    let uploadedURL : string = null;

    let tokens = {}
    let permanent = 0;
    let total = 0;
    let percent = {}
    let breakdown = []
    let distribution = "";

    let avatar = "";
    let countingTokens : boolean = false;

    $: has_lorebook = $editing && $editing.data.character_book && (typeof $editing.data.character_book === "object") && Object.keys($editing.data.character_book).length > 0

    $: {
        if( $editing ){
            if( $editing.temp.tokens ){
                tokens = $editing.temp.tokens

                permanent = 0;
                total = 0;
                percent = {};
                breakdown = [];
                distribution = "";

                if( $editing && $editing.temp.tokens ){
                    Object.keys(tokens).forEach( key =>{
                        total += tokens[key];
                        if( key !== "greeting" && key !== "system" ){
                            permanent += tokens[key]
                        }
                    });

                    breakdown.push( `${total} Total tokens\n` )
                    Object.keys(tokens).forEach( key => {
                        let k = key.charAt(0).toUpperCase() + key.slice(1)
                        percent[key] = tokens[key] / total * 100
                        breakdown.push( `${tokens[key]} ${k} (${percent[key].toFixed(2)}%)` )
                        if( isNaN(percent[key]) ){
                            distribution += `0px `
                        }else{
                            distribution += `${percent[key]}% `
                        }
                    })
                }
            }
            refreshAvatar();
        }
    }

    async function CreateCharacter(){
        if( $creating ){
            if( !$editing.data.name ){
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
        $editing.metadata.modified = Date.now()

        const formData = new FormData();
        const fileName = $creating ? $editing.data.name + "-" + Date.now() : $editing.temp.filepath
        formData.append("file", uploadInput.files[0])
        formData.append("character", JSON.stringify( $editing ))
        formData.append("filepath", fileName)

        if( $creating ){
            formData.append("creating", "true" )
        }

        await fetch( localServer + "/save_character_image", {
            method: "POST",
            body: formData
        }).then( result => {
            result.json().then( async data => {
                if( data ){
                    if( $creating ){

                        let created = $editing;
                        $characterList.push(created)
                        $characterList = $characterList;
                        await Server.getCharacterList();
                        $editing = null;
                        $creating = false;
                        alert("Successfully created character:\n" + created.data.name)
                    }else{
                        if( $editing && $editing.temp.avatar ){
                            let edited = await Server.request("/get_character", {
                                filepath: $editing.temp.filepath
                            });

                            $currentCharacter = edited;
                            $editing = edited;

                            // update item on list

                            for( let i = 0; i < $characterList.length; i++ ){
                                if( $characterList[i].temp.filepath == $editing.temp.filepath){
                                    $characterList[i] = edited;
                                    break;
                                }
                            }

                            await refreshTokens();
                            refreshAvatar();
                            avatar = avatar;
                        }

                        if( $currentChat && $currentCharacter ){
                            $currentChat.participants[0] = $currentCharacter.data.name
                            if( $currentChat.messages.length == 1 && $currentChat.messages[0].participant > -1 ){
                                $currentChat.messages[0].candidates[0].text = $currentCharacter.data.first_mes;
                                $currentChat.messages[0].candidates[0].text = Format.parseMacros($currentChat.messages[0].candidates[0].text, $currentChat)
                                $currentChat.messages[0].candidates[0].text = Format.parseNames($currentChat.messages[0].candidates[0].text, $currentProfile.name ,$currentCharacter.data.name)
                                $currentChat.messages[0].index = 0;

                                $currentChat = $currentChat;
                            }
                        }
                    }
                }else{
                    alert("Could not create the character.")
                }
            })
        })

        // console.log("Saved character: %o", $editing)
        $fetching = false
    }

    async function DeleteCharacter(){
        if( $editing && window.confirm("Are you sure you want to delete this character?\nThis action is irreversible!")){
            if( $editing.temp.filepath === $currentCharacter.temp.filepath ){
                $currentCharacter = null;
                $currentChat = null;
            }

            let result = await Server.request("/delete_character", {
                filepath: $editing.temp.filepath
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
        if( $editing && !countingTokens){
            countingTokens = true
            await Server.getCharacterTokens( $editing ).then( data => {
                $editing.temp.tokens = data;
            }).catch(error => {
                console.log(error)
            })
            countingTokens = false
        }
    }

    function SetUploadImage(){
        if( !uploadInput.files ){
            return;
        }

        if( uploadedURL ){
            URL.revokeObjectURL(uploadedURL)
        }
        uploadedURL = URL.createObjectURL(uploadInput.files[0])
        $editing.temp.avatar = uploadedURL
        refreshAvatar();
    }

    function refreshAvatar(){
        if( $creating && $editing.temp.avatar ){
            avatar = $editing.temp.avatar;
        }else{
            avatar = `${localServer + "/user/characters/" + $editing.temp.filepath}?${$editing.metadata.modified}`
            avatar = avatar.replaceAll("\\", "/")
        }
    }

    function Close(){
        if( $creating ){
            const ok = confirm("You have unsaved changes!\nAre you sure you want to exit? You will lose this character forever!")
            if ( ok ){
                $editing = null;
            }
        }else{
            $editing = null;
        }
    }

    function OpenImage(){
        window.open( localServer + "/" + $editing.temp.filepath.replace("../", "") ,  "_blank");
    }

    function AddGreeting(){
        $editing.data.alternate_greetings.push("Hello, {{user}}!")
        $editing.data.alternate_greetings = $editing.data.alternate_greetings;
    }

    function DuplicateGreeting(id : number, item : string){
        $editing.data.alternate_greetings.splice(id, 0, item)
        $editing.data.alternate_greetings = $editing.data.alternate_greetings;
    }

    function RemoveGreeting(id : number){
        $editing.data.alternate_greetings.splice(id, 1)
        $editing.data.alternate_greetings = $editing.data.alternate_greetings;
    }

    function createLorebook(){
        if(!has_lorebook){
            let filename = $editing.temp.filepath.split("/").pop()
            filename = filename.split(".").shift()
            filename += ".json"

            $editing.data.character_book = {
                name: `${$editing.data.name}'s Lorebook`,
                token_budget: 100,
                recursive_scanning: false,
                scan_depth: 5,
                entries: [],
                extensions: {},
                temp: { filepath: filename }
            }

            $editing = $editing;
            ApplyChanges()
        }
    }

    async function installLorebook(){
        if(has_lorebook && confirm("Are you sure you want to install this lorebook?\nIt will overwrite any existing lorebook for this character.")){
            let filename = $editing.temp.filepath.split("/").pop()
            filename = filename.split(".").shift()
            filename += ".json"

            let current = $editing.data.character_book
            current.temp = { filepath: filename }

            await Server.request("/save_lorebook", { book: current })
            $currentLorebooks.push(current)
            $currentLorebooks = $currentLorebooks;
        }
    }

    function removeLorebook(){
        if(has_lorebook && confirm("Are you sure you want to remove this lorebook?\nThis action cannot be undone.")){
            $editing.data.character_book = undefined
            $editing = $editing;
            ApplyChanges()
        }
    }
</script>


{#if $editing }
    <Screen>
        <div class="top" on:change={SaveCharacter} >
            <div class="section header">
                <div class="avatar">
                    <img src={avatar} alt=""/>
                    <button class="upload" on:click={() => uploadInput.click()}>{("Change Avatar").toUpperCase()}</button>
                    <form action="/save_character_image" enctype="multipart/form-data" method="post">
                        <input name="file" type="file" bind:this={uploadInput} bind:value={$editing.temp.avatar} on:change={SetUploadImage}>
                    </form>
                </div>

                <div>
                    <p class="explanation">Currently editing</p>
                    <h1 class="title" style="font-size: 120%">{$editing.data.name}</h1>

                    <div class="tokens" title={breakdown.join("\n")}>
                        {#if countingTokens}
                            <div class="label">Counting tokens...</div>
                        {:else}
                            <div class="label"><strong>{permanent}</strong> Permanent Tokens</div>
                        {/if}

                        <div class="meter" style="grid-template-columns:{distribution}">
                            {#each Object.keys(tokens) as type}
                                <div class={type}></div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>

            <button class="close normal" title="Close window" on:click={Close}>{@html SVG.close}</button>
            <button class="open normal" title="Open image in new tab" on:click={OpenImage}>{@html SVG.open}</button>
        </div>

        <div class="bottom" on:input={refreshTokens} on:change={SaveCharacter}>
            <div class="section wide">
                <Heading title="Name" description="The name of the character displayed in chat."/>
                <input type="text" class="component wide" bind:value={$editing.data.name}>
            </div>

            <Accordion name="General Information">
                <div class="section wide">
                    <Heading title="Author" description="The name of the creator."/>
                    <input type="text" class="component wide" placeholder="Unknown author" bind:value={$editing.data.creator}>
                </div>

                <div class="section wide">
                    <Heading title="Author's Notes" description="General information about the character."/>
                    <textarea class="component wide" rows=6 bind:value={$editing.data.creator_notes}></textarea>
                </div>
            </Accordion>

            <div class="section wide greeting">
                <Heading title="Greeting" description="The character will start a chat with this message."/>
                <textarea class="component wide" rows=12 bind:value={$editing.data.first_mes}></textarea>
            </div>

            <Accordion name="Alternate Greetings">
                {#each $editing.data.alternate_greetings as alt, i}
                    <div class="altgreeting">
                        <div class="controls">
                            <button class="component info" title="Duplicate" on:click={() => DuplicateGreeting(i, alt)}>{@html SVG.copy}</button>
                            <button class="component danger" title="Remove greeting" on:click={() => RemoveGreeting(i)}>{@html SVG.trashcan}</button>
                        </div>
                        <textarea class="component wide" rows=8 bind:value={alt}></textarea>
                    </div>
                {/each}
                <button class="component normal" on:click={AddGreeting}>{@html SVG.plus}Add greeting</button>
            </Accordion>

            <div class="section wide description">
                <Heading title="Description" description="Description of personality and other characteristics."/>
                <textarea class="component wide" rows=16 bind:value={$editing.data.description}></textarea>
            </div>

            <div class="section wide personality">
                <Heading title="Personality" description="A brief description of the personality."/>
                <textarea class="component wide" rows=4 bind:value={$editing.data.personality}></textarea>
            </div>

            <div class="section wide scenario">
                <Heading title="Scenario" description="Circumstances and context of the dialogue."/>
                <textarea class="component wide" rows=4 bind:value={$editing.data.scenario}></textarea>
            </div>

            <div class="section wide dialogue">
                <Heading title="Example dialogue" description="Forms a personality more clearly."/>
                <textarea class="component wide" rows=8 bind:value={$editing.data.mes_example}></textarea>
            </div>

            <Accordion name="Advanced Settings">

                <div class="section wide">
                    <Heading title="Version" description="The version of this character's iteration, if applicable."/>
                    <input type="text" class="component wide" bind:value={$editing.data.character_version}>
                </div>

                <div class="section wide">
                    <Heading title="System Prompt" description="Overrides the main prompt defined by your API settings."/>
                    <textarea class="component wide" rows=6 bind:value={$editing.data.system_prompt}></textarea>
                </div>

                <div class="section wide">
                    <Heading title="Post-History Instructions" description={`Also known as "jailbreak", overrides the jailbreak prompt defined by your API settings.`}/>
                    <textarea class="component wide" rows=6 bind:value={$editing.data.post_history_instructions}></textarea>
                </div>

            </Accordion>

            <Accordion name="Character Book">

                <div class="section horizontal wide wrap">
                    {#if has_lorebook}
                        <button class="component confirm" on:click={installLorebook}>{@html SVG.download} Install</button>
                        <button class="component danger" on:click={removeLorebook}>{@html SVG.trashcan} Delete</button>
                    {:else}
                        <button class="component confirm" on:click={createLorebook}>{@html SVG.plus} Create</button>
                    {/if}

                    <!-- <button class="component info" >{@html SVG.copy} Copy from local</button> -->
                </div>


                {#if has_lorebook}
                    <Heading
                        title={$editing.data.character_book?.name ? $editing.data.character_book.name : "Embedded Lorebook"}
                        description={`This lorebook belongs to ${$editing.data.name}.`}
                    />
                    <Book bind:book={$editing.data.character_book}/>
                {:else}
                    <div class="empty">This character doesn't have an embedded lorebook. You can create a new one or copy from a local one.</div>
                {/if}

            </Accordion>

            <div class="wide horizontal center">
                {#if $creating}
                    <button class="component confirm" on:click={CreateCharacter}>Create Character</button>
                {:else}
                    <button class="component danger" on:click={DeleteCharacter}>Delete Character</button>
                {/if}
            </div>
        </div>

        <Footer/>
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

    .open{
        height: 32px;
        position: absolute;
        right: 8px;
        bottom: 12px;
        width: 32px;
    }

    .top{
        background: var( --default-bg-color );
        border-bottom: 1px solid hsla(0, 0%, 50%, 0.5);
        display: flex;
        flex-direction: column;
        justify-content: start;
        gap: 16px;
        box-shadow: 0px 20px 20px -20px #00000040;
        position: fixed;
        padding: 0px;
        top: var(--header-height);
        width: 100%;
        max-width: var( --chat-width );
        z-index: 1;
    }

    .top .section.header{
        width: 100%;
        padding: 16px 20px;
    }

    .header{
        display: grid;
        gap: 16px;
        grid-template-columns: min-content auto;
    }

    .bottom{
        display: flex;
        height: fit-content;
        flex-direction: column;
        gap: 32px;
        padding: 128px 20px 24px 20px;
        scrollbar-color: #303030 transparent;
        scrollbar-width: thin;
    }

    .section{
        width: 100%;
    }

    .tabs{
        padding: 0px;
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

    .meter .greeting{ background: hotpink; }
    .meter .description{ background: royalblue; }
    .meter .personality{ background: mediumspringgreen; }
    .meter .scenario{ background: gold; }
    .meter .dialogue{ background: tomato; }

    .meter div{ margin-right: 2px; }

    .greeting textarea{ border-left-color: hotpink; }
    .description textarea{ border-left-color: royalblue; }
    .personality textarea{ border-left-color: mediumspringgreen; }
    .scenario textarea{ border-left-color: gold; }
    .dialogue textarea{ border-left-color: tomato; }

    .altgreeting{
        display: grid;
        grid-template-columns: 32px auto;
        gap: 8px;
    }

    .altgreeting .controls{
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .altgreeting button{
        padding: 6px;
        max-width: 40px;
    }

    .component :global(svg){
        width: 16px;
        height: 16px;
    }

    .top :global(svg){
        width: 24px;
        height: 24px;
    }

    .empty{
        text-align: center;
    }

</style>