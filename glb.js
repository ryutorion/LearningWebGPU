class GLBChunk {
    static get HEADER_BYTE_LENGTH() { return 8; }
    static get TYPE_JSON() { return 0x4E4F534A; }
    static get TYPE_BIN() { return 0x004E4942; }

    #type;
    get type() { return this.#type; }

    #data;
    get data() { return this.#data; }

    constructor(buffer, offset) {
        const header = new Uint32Array(buffer, offset, 2);

        const start = offset + header.byteLength;
        const end = start + header[0];

        this.#type = header[1];
        this.#data = buffer.slice(start, end);
    }
}

export class GLB {
    static get MAGIC() { return 0x46546C67; }

    #json;
    get json() { return this.#json; }

    #buffer;
    get buffer() { return this.#buffer; }

    constructor(buffer) {
        let offset = 0;
        const header = new Uint32Array(buffer, offset, 3);
        offset += header.byteLength;

        if(header[0] !== GLB.MAGIC) {
            throw new Error(`Invalid GLB magic number ${header[0].toString(16)}`);
        }

        if(header[1] !== 2) {
            throw new Error(`Invalid GLB version ${header[1]}`);
        }

        const chunkJSON = new GLBChunk(buffer, offset);
        if(chunkJSON.type !== GLBChunk.TYPE_JSON) {
            throw new Error(`Invalid GLB JSON chunk type ${chunkJSON.type}`);
        }
        offset += GLBChunk.HEADER_BYTE_LENGTH + chunkJSON.data.byteLength;

        this.#json = JSON.parse(new TextDecoder().decode(chunkJSON.data));

        const chunkBinary = new GLBChunk(buffer, offset);
        if(chunkBinary.type !== GLBChunk.TYPE_BIN) {
            throw new Error(`Invalid GLB binary chunk type ${chunkBinary.type}`);
        }

        this.#buffer = chunkBinary.data;
    }
}