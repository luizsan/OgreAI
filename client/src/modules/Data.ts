export function download(content: string, filename: string): void {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    if (!filename.endsWith(".json")) {
        filename += ".json";
    }
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function upload(next: (data: string) => void): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.classList.add('hidden');
    document.body.appendChild(input);

    function destroy(): void {
        document.body.removeChild(input);
    }

    input.addEventListener('change', () => {
        if (input.files && input.files.length > 0) {
            handleInputFile(input.files[0]).then(data => {
                destroy();
                next(data);
            });
        }
    });

    input.addEventListener('cancel', () => {
        destroy();
    });

    input.click();
}

export async function handleInputFile(file: File): Promise<string | undefined> {
    if (!file) return undefined;
    const reader = new FileReader();
    return new Promise<string>((resolve, reject) => {
        reader.onload = function (event: ProgressEvent<FileReader>) {
            resolve(event.target?.result as string);
        };
        reader.onerror = function (event: ProgressEvent<FileReader>) {
            reject(event.target?.error);
        };
        reader.readAsText(file);
    });
}
