const ComponentCount = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16
};

const ComponentTypeByteLength = {
    5120: 1, // BYTE
    5121: 1, // UNSIGNED_BYTE
    5122: 2, // SHORT
    5123: 2, // UNSIGNED_SHORT
    5125: 4, // UNSIGNED_INT
    5126: 4, // FLOAT
};

const IndexFormat = {
    5123: 'uint16',
    5125: 'uint32'
};

function createBuffer(device, glb, accessor, usage) {
    const bufferView = glb.json.bufferViews[accessor.bufferView];
    const byteLength = ComponentTypeByteLength[accessor.componentType] * ComponentCount[accessor.type] * accessor.count;
    let byteOffset = 0;
    if(accessor.byteOffset !== undefined) {
        byteOffset += accessor.byteOffset;
    }
    if(bufferView.byteOffset !== undefined) {
        byteOffset += bufferView.byteOffset;
    }

    const buffer = device.createBuffer({
        size: byteLength,
        usage: usage,
        mappedAtCreation: true
    });
    new Uint8Array(buffer.getMappedRange()).set(
        new Uint8Array(glb.buffer, byteOffset, byteLength)
    );
    buffer.unmap();

    return buffer;
}

export class GLTFPrimitive {
    #vertexBuffer;
    #indexBuffer;
    #indexCount;
    #indexFormat;

    static get COMPONENT_TYPE_BYTE() { return 5120; }
    static get COMPONENT_TYPE_UNSIGNED_BYTE() { return 5121; }
    static get COMPONENT_TYPE_SHORT() { return 5122; }
    static get COMPONENT_TYPE_UNSIGNED_SHORT() { return 5123; }
    static get COMPONENT_TYPE_UNSIGNED_INT() { return 5125; }
    static get COMPONENT_TYPE_FLOAT() { return 5126; }

    constructor(device, glb, primitive) {
        this.#vertexBuffer = createBuffer(
            device,
            glb,
            glb.json.accessors[primitive.attributes.POSITION],
            GPUBufferUsage.VERTEX
        );

        if(primitive.indices == undefined) {
            return;
        } 

        const indexAccessor = glb.json.accessors[primitive.indices];
        this.#indexBuffer = createBuffer(device, glb, indexAccessor, GPUBufferUsage.INDEX);
        this.#indexCount = indexAccessor.count;
        this.#indexFormat = IndexFormat[indexAccessor.componentType];
    }

    draw(renderPass) {
        renderPass.setVertexBuffer(0, this.#vertexBuffer);
        renderPass.setIndexBuffer(this.#indexBuffer, this.#indexFormat);
        renderPass.drawIndexed(this.#indexCount, 1, 0, 0, 0);
    }
}