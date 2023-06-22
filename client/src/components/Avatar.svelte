<script lang="ts">
    import { currentProfile, currentCharacter, currentChat, busy, deleting, localServer, deleteList, fetching } from '../State';

    export let is_bot : boolean
    export let size : number = 56
    export let character : ICharacter = null;

    let w : number;
    let h : number;
    let ratio : number = 1;
    let roundness : string = "50%";

    const avatar_user_default = localServer + "/img/user_default.png";

    let append : string;
    let img : string;
    let url : string;

    $: {

        if($currentProfile.customization){
            switch($currentProfile.customization.avatarShape){
                case "square":
                    roundness = "5px";
                    ratio = 1;
                    break;
                    
                case "portrait":
                    roundness = "5px";
                    ratio = (2 / 3.0)
                    break;

                default:
                    roundness = "50%";
                    ratio = 1;
                    break;
            }
        }

        w = size;
        h = size * ( ratio >= 1 ? ratio : (1.0 / ratio ));
        
        if(is_bot && character){
            img = localServer + "/" + character.metadata.filepath.replace("../", "")
            append = is_bot ? "?" + character.last_changed : "";
        }else{
            img = $currentProfile.avatar ? $currentProfile.avatar : avatar_user_default;
            append = ""
        }

        url = encodeURIComponent(img).replace(/%2F/g, '/').replace(/%3A/g, ':') + append;
    }
</script>

<div class="avatar" style="background-image: url({url}); width: {w}px; height: {h}px; border-radius: {roundness}"></div>

<style>
    .avatar{
        background: #00000020;
        background-size: cover;
        background-position: center;
    }
</style>