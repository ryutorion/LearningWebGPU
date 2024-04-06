const swapchainFormat = navigator.gpu.getPreferredCanvasFormat();
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const context = canvas.getContext('webgpu');
context.configure({
    device: device,
    format: swapchainFormat
});

const shaderCode = `@vertex
fn VS(@builtin(vertex_index) index : u32) -> @builtin(position) vec4<f32> {
    const positions = array<vec3<f32>, 3>(
        vec3<f32>( 0.0,  0.5, 0.0),
        vec3<f32>(-0.5, -0.5, 0.0),
        vec3<f32>( 0.5, -0.5, 0.0)
    );
    return vec4<f32>(positions[index], 1.0);
}

@fragment
fn FS() -> @location(0) vec4<f32> {
    return vec4<f32>(1.0, 0.0, 0.0, 1.0);
}`;
const shaderModule = device.createShaderModule({ code: shaderCode });
console.log(await shaderModule.getCompilationInfo());

const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
        module: shaderModule,
        entryPoint: 'VS'
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
    ]
});

renderPass.setPipeline(renderPipeline);
renderPass.draw(3, 1, 0, 0);
renderPass.end();

device.queue.submit([commandEncoder.finish()]);