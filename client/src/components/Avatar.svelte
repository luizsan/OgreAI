<script lang="ts">
    import { currentProfile, localServer } from '../State';
    import type { ICharacter } from '@shared/types';

    export let is_bot : boolean
    export let size : number = 56
    export let character : ICharacter = null;

    let w : number;
    let h : number;
    let ratio : number = 1;
    let roundness : number = 50;
    let unit : string = "%"

    const avatar_user_default = localServer + "/img/user_default.png";
    const protocol_regex = /^([a-zA-Z]+):\/\//;

    let append : string;
    let img : string;
    let url : string;

    $: {

        if($currentProfile.customization){
            switch($currentProfile.customization.avatarShape){
                case "square":
                    roundness = 5;
                    unit = "px"
                    ratio = 1;
                    break;

                case "portrait":
                    roundness = 5;
                    unit = "px"
                    ratio = (2 / 3.0)
                    break;

                default:
                    roundness = 50;
                    unit = "%"
                    ratio = 1;
                    break;
            }
        }

        w = size;
        h = size * ( ratio >= 1 ? ratio : (1.0 / ratio ));

        if(is_bot && character){
            img = localServer + "/user/characters/" + character.temp.filepath.replace("../", "")
            append = is_bot ? "?" + character.metadata.modified : "";
        }else{
            img = $currentProfile.avatar ? $currentProfile.avatar : avatar_user_default;
            if(!protocol_regex.test(img)){
                img = localServer + "/" + img;
            }
            append = ""
        }

        url = encodeURIComponent(img).replace(/%2F/g, '/').replace(/%3A/g, ':') + append;
    }
</script>

<div class="avatar" style="background-image: url({url}); width: {w}px; height: {h}px; border-radius: {roundness}{unit}"></div>

<style>
    .avatar{
        background: #00000020;
        background-size: cover;
        background-position: center;
    }
</style>