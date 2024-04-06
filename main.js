const swapchainFormat = navigator.gpu.getPreferredCanvasFormat();
const depthFormat = 'depth32float';
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const context = canvas.getContext('webgpu');
context.configure({
    device: device,
    format: swapchainFormat
});

const shaderCode = `struct VSOut {
    @builtin(position) position : vec4<f32>,
    @location(0) color : vec3<f32>,
};

@vertex
fn VS(@builtin(vertex_index) index : u32) -> VSOut {
    const positions = array<vec3<f32>, 6>(
        vec3<f32>( 0.0 + 0.25,  0.5, 0.5),
        vec3<f32>(-0.5 + 0.25, -0.5, 0.5),
        vec3<f32>( 0.5 + 0.25, -0.5, 0.5),
        vec3<f32>( 0.0 - 0.25,  0.5, 0.0),
        vec3<f32>(-0.5 - 0.25, -0.5, 0.0),
        vec3<f32>( 0.5 - 0.25, -0.5, 0.0),
    );
    const colors = array<vec3<f32>, 2>(
        vec3<f32>(1.0, 0.0, 0.0),
        vec3<f32>(0.0, 1.0, 0.0),
    );

    var out : VSOut;
    out.position = vec4<f32>(positions[index], 1.0);
    out.color = colors[index / 3];

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
renderPass.draw(6, 1, 0, 0);
renderPass.end();

device.queue.submit([commandEncoder.finish()]);