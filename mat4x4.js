export class mat4x4 {
    #m;

    constructor(
        m00, m01, m02, m03,
        m10, m11, m12, m13,
        m20, m21, m22, m23,
        m30, m31, m32, m33
    ) {
        this.#m = new Float32Array([
            m00, m10, m20, m30,
            m01, m11, m21, m31,
            m02, m12, m22, m32,
            m03, m13, m23, m33
        ]);
    }

    static Translation(x, y, z) {
        return new mat4x4(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            x, y, z, 1
        );
    }

    static Scale(x, y, z) {
        return new mat4x4(
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1
        );
    }

    static RotationX(rad) {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return new mat4x4(
            1, 0, 0, 0,
            0, c, s, 0,
            0, -s, c, 0,
            0, 0, 0, 1
        );
    }

    static RotationY(rad) {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return new mat4x4(
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1
        );
    }

    static RotationZ(rad) {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return new mat4x4(
            c, s, 0, 0,
            -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        );
    }

    get byteLength() {
        return this.#m.byteLength;
    }

    mapToBuffer(buffer) {
        new Float32Array(buffer.getMappedRange()).set(this.#m);
    }
};