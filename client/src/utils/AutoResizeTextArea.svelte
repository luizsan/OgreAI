<script context="module" lang="ts">
    export function Resize({ target }) {
        target.style.height = "1px";
        target.style.height = (+target.scrollHeight)+"px";
    }

    export function AutoResizeTextArea( element : HTMLElement ){
        Resize({ target: element });
        element.style.overflowY = 'hidden';
        element.addEventListener('input', Resize);
        return {
            destroy: () => element.removeEventListener('input', Resize)
        }
    }
</script>