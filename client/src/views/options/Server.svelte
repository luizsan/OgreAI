<script lang="ts">
    import * as Server from "@/Server";
    import { fetching } from "@/State";

    async function ImportChats(){
        $fetching = true;
        const success = await Server.request("/import_chats", {})
        console.log(success)
        $fetching = false;
    }

    async function ImportLorebooks(){
        $fetching = true;
        const success = await Server.request("/import_lorebooks", {})
        console.log(success)
        $fetching = false;
    }
</script>


<div class="section">
    <div>
        <p class="normal disabled"><b>Warning!</b></p>
        <p><small class="danger disabled">Make sure you have a backup of your existing database! Any changes made here are permanent and will affect your personal data.</small></p>
    </div>
    <div/>
    <button class="component wide" on:click={ImportChats}>Import Legacy Chats</button>
    <button class="component wide" on:click={ImportLorebooks}>Import Legacy Lorebooks</button>
</div>