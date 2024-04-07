const swapchainFormat = navigator.gpu.getPreferredCanvasFormat();
const depthFormat = 'depth32float';
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const context = canvas.getContext('webgpu');
context.configure({
    device: device,
    format: swapchainFormat
});

const shaderCode = `struct VSIn {
    @location(0) position : vec3<f32>,
    @location(1) color : vec3<f32>,
};

struct VSOut {
    @builtin(position) position : vec4<f32>,
    @location(0) color : vec3<f32>,
};

@vertex
fn VS(in : VSIn) -> VSOut {
    var out : VSOut;
    out.position = vec4<f32>(in.position, 1.0);
    out.color = in.color;

    return out;
}

@fragment
fn FS(@location(0) color : vec3<f32>) -> @location(0) vec4<f32> {
    return vec4<f32>(color, 1.0);
}`;
const shaderModule = device.createShaderModule({ code: shaderCode });
console.log(await shaderModule.getCompilationInfo());

const depthTexture = device.createTexture({
    size: [ canvas.width, canvas.height ],
    format: depthFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

const vertices = new Float32Array([
     0.0 + 0.25,  0.5, 0.5, 1.0, 0.0, 0.0,
    -0.5 + 0.25, -0.5, 0.5, 1.0, 0.0, 0.0,
     0.5 + 0.25, -0.5, 0.5, 1.0, 0.0, 0.0,
     0.0 - 0.25,  0.5, 0.0, 0.0, 1.0, 0.0,
    -0.5 - 0.25, -0.5, 0.0, 0.0, 1.0, 0.0,
     0.5 - 0.25, -0.5, 0.0, 0.0, 1.0, 0.0,
]);
const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true
});
new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
vertexBuffer.unmap();

const indices = new Uint16Array([
    0, 1, 2,
    3, 4, 5,
]);
const indexBuffer = device.createBuffer({
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true
});
new Uint16Array(indexBuffer.getMappedRange()).set(indices);
indexBuffer.unmap();

const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
        module: shaderModule,
        entryPoint: 'VS',
        buffers: [
            {
                arrayStride: Float32Array.BYTES_PER_ELEMENT * 6,
                attributes: [
                    {
                        format: 'float32x3',
                        offset: 0,
                        shaderLocation: 0,
                    },
                    {
                        format: 'float32x3',
                        offset: Float32Array.BYTES_PER_ELEMENT * 3,
                        shaderLocation: 1,
                    },
                ],
            },
        ],
    },
    fragment: {
        module: shaderModule,
        entryPoint: 'FS',
        targets: [
            {
                format: swapchainFormat
            },
        ]
    },
    depthStencil: {
        format: depthFormat,
        depthWriteEnabled: true,
        depthCompare: 'greater-equal'
    },
});

const commandEncoder = device.createCommandEncoder();

const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
        {
            view: context.getCurrentTexture().createView(),
            clearValue: [0.0, 0.0, 0.0, 1.0],
            loadOp: 'clear',
            storeOp: 'store',
        }
    ],
    depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 0.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
    },
});

renderPass.setPipeline(renderPipeline);
renderPass.setVertexBuffer(0, vertexBuffer);
renderPass.setIndexBuffer(indexBuffer, 'uint16');
renderPass.drawIndexed(indices.length, 1, 0, 0, 0);
renderPass.end();

device.queue.submit([commandEncoder.finish()]);