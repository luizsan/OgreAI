// declarations.d.ts

declare module 'png-chunks-extract' {
    interface Chunk { name: string; data: Uint8Array }
    function extract(data: Uint8Array | Buffer): Chunk[];
    export default extract;
}

declare module 'png-chunks-encode' {
    interface Chunk { name: string; data: Uint8Array }
    function encode(chunks: Chunk[]): Buffer;
    export default encode;
}

declare module 'png-chunk-text' {
    interface TextChunk { keyword: string; text: string }
    function decode(data: Uint8Array): TextChunk;
    function encode(keyword: string, text: string): { name: 'tEXt'; data: Uint8Array };
    export { decode, encode };
}