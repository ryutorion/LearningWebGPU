import { GLTFPrimitive } from './GLTFPrimitive.js';

export class GLTFMesh {
    #primitives;

    constructor(device, glb, mesh) {
        this.#primitives = mesh.primitives.map(primitive => new GLTFPrimitive(device, glb, primitive));
    }

    draw(renderPass) {
        this.#primitives.forEach(primitive => primitive.draw(renderPass));
    }
}