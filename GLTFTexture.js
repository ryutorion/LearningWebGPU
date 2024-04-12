export class GLTFTexture {
    #texture;
    #view;
    get view() { return this.#view; }

    constructor(device, images, texture) {
        const image = images[texture.source];

        this.#texture = device.createTexture({
            size: [ image.width, image.height, 1 ],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.#view = this.#texture.createView();

        device.queue.copyExternalImageToTexture(
            { source: image },
            { texture: this.#texture },
            [ image.width, image.height ]
        );
    }
}