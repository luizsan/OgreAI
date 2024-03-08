<script>
    import Avatar from "../components/Avatar.svelte";
    import { currentProfile } from "../State";
    import * as Server from "./Server.svelte";

    let themes = [
        { key: "light", label: "Light" }, 
        { key: "dark", label: "Dark" }
    ]

    let selectedTheme = window.localStorage.getItem("theme") || "dark"

    function setTheme(){
        window.localStorage.setItem("theme", selectedTheme)
        for(let i = 0; i < themes.length; i++){
            document.body.classList.remove( themes[i].key )
        }
        document.body.classList.add(selectedTheme)
    }

</script>

<div class="content wide" on:change={() => Server.request("/save_profile", $currentProfile)}>
    <div class="section">
        <div>
            <div class="title">Display Name</div>
            <div class="explanation">User's name displayed in chat.</div>
        </div>
        <input type="text" class="component wide" bind:value={$currentProfile.name}>
    </div>

    <div class="section avatar grid">
        <div class="avatar container">
            <Avatar is_bot={false} size={80}/>
        </div>
        
        <div class="section" style="gap: 24px">
            <div class="section">
                <div>
                    <div class="title">Avatar Image</div>
                    <div class="explanation">User avatar URL.</div>
                </div>
                <input type="text" class="component wide" bind:value={$currentProfile.avatar}>
            </div>

            <div class="section">
                <div>
                    <div class="title">Avatar Style</div>
                    <div class="explanation">Define the avatar style in chat.</div>
                </div>

                <select class="component" bind:value={$currentProfile.customization.avatarShape}>
                    <option value="round">Round</option>
                    <option value="square">Square</option>
                    <option value="portrait">Portrait</option>
                </select>
            </div>
        </div>
    </div>

    <div class="section">
        <div>
            <div class="title">Theme</div>
            <div class="explanation">Define your preferred color scheme.</div>
        </div>

        <div class="section" on:change={setTheme}>

        {#each themes as item}
            <label for="theme_light">
                <input type="radio" class="component" bind:group={selectedTheme} name="theme" value={item.key}>
                {item.label}
            </label>
        {/each}

        </div>
    </div>

</div>


<style>
    :global(p) {
        margin: 0px;
    }

    .title{
        font-weight: 600;
        margin: 0px;
    }

    .explanation{
        color: #606060;
        font-size: 85%;
    }

    .content{
        display: flex;
        flex-direction: column;
        gap: 32px;
        padding: 16px;
        box-sizing: border-box;
    }

    .avatar.grid{
        display: grid;
        grid-template-columns: min-content auto;
        gap: 32px;
    }

    .avatar.container{
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
    }


</style>