<script lang="ts" context="module">

    export function download( content : string, filename : string ){
        let blob = new Blob([ content ], { type: "application/json" });
        let url = URL.createObjectURL(blob);
        let a = document.createElement("a");
        if(!filename.endsWith(".json")){
            filename += ".json"
        }
        a.href = url;
        a.download = filename
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url)
    }

    export async function upload(next : Function){
        let input = document.createElement('input');
        input.type = 'file';
        input.classList.add('hidden')
        document.body.appendChild(input);

        function destroy(){
            document.body.removeChild(input);
        }

        input.addEventListener('change', () => {
            if(input.files.length > 0){
                return handleInputFile(input.files[0]).then(data => {
                    destroy()
                    next(data)
                })
            }
        });

        input.addEventListener('cancel', ()=>{
            destroy()
        })

        input.click();
    }


    export async function handleInputFile( file : File ) : Promise<string|undefined>{
        if(!file) return undefined;
        const reader = new FileReader();
        return new Promise<string>((resolve, reject) => {
            reader.onload = function (event: ProgressEvent<FileReader>) {
                resolve(event.target.result as string);
            }
            reader.onerror = function (event: ProgressEvent<FileReader>) {
                reject(event.target.error)
            }
            reader.readAsText(file);
        })
    }


</script>