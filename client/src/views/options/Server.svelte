<script lang="ts">
    import * as Dialog from "@/modules/Dialog.ts";
    import * as Server from "@/Server";
    import { busy, fetching } from "@/State";

    const actions = [
        {
            "endpoint": "/import_chats",
            "name": "Import Legacy Chats",
            "description": "This action will convert your .json and .jsonl chat files into the database, skipping existing chats. This action cannot be undone. Are you sure you want to import legacy chats?"
        },
        {
            "endpoint": "/import_lorebooks",
            "name": "Import Legacy Lorebooks",
            "description": "This action will convert your .json lorebook files into the database, overwriting existing lorebooks if their titles match. This action cannot be undone. Are you sure you want to import legacy lorebooks?"
        },
        {
            "endpoint": "/update_interactions",
            "name": "Update Chat Last Interactions",
            "description": "This action will update the last interaction timestamp for all chats. This action cannot be undone. Are you sure you want to update interactions?"
        },
    ]

    async function ActionTemplate(endpoint: string, description: string){
        if($busy ||$fetching){
            return
        }
        const ok = await Dialog.confirm("OgreAI", description)
        if( ok ){
            $fetching = true;
            const success = await Server.request(endpoint, {})
            if( success ){
                await Dialog.alert("OgreAI", "Action completed!")
            }else{
                await Dialog.alert("OgreAI", "Action failed! Check the browser console and server logs for more information.")
            }
            $fetching = false;
        }
    }
</script>


<div class="section">
    <div class="warning">
        <h2 class="danger disabled">Warning!</h2>
        <p class="disabled">Make sure you have a backup of your existing database!</p>
        <p class="disabled">Any actions taken here will directly affect your database in an irreversible way,
            potentially resulting in permanent data loss.</p>
    </div>
    <div style="height: 16px"/>
    <div class="section center actions">
        {#each actions as action}
            <button class="component wide" on:click={() => ActionTemplate(action.endpoint, action.description)}>{action.name}</button>
        {/each}
    </div>
</div>


<style>
    h2{
        font-size: 1.75em;
        margin-top: 0px;
        margin-bottom: 8px;
    }

    .warning{
        text-align: center;
        padding: 24px;
        border: 2px solid hsla(0, 100%, 50%, 0.5);
        background: hsla(0, 100%, 10%, 0.25);
        border-radius: 10px;
        display: flex;
        gap: 8px;
        flex-direction: column;
    }

    .warning p{
        font-size: 90%;
    }

    .actions{
        padding: 0px 20%;
    }
</style>