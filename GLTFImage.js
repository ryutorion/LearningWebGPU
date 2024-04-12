export class GLTFImage {
    static load(glb, image) {
        const bufferView = glb.json.bufferViews[image.bufferView];
        const start = bufferView.byteOffset;
        const end = start + bufferView.byteLength;
        const blob = new Blob([glb.buffer.slice(start, end)], { type: image.mimeType });
        const url = URL.createObjectURL(blob);
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
            img.crossOrigin = '';
        });
    }
};