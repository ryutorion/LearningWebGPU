import { mat4x4 } from './mat4x4.js';
import { vec3 } from './vec3.js';
import { GLB } from './glb.js';
import { GLTFMesh } from './GLTFMesh.js';

function deg2rad(degree) {
    return degree * Math.PI / 180;
}

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
};

struct VSOut {
    @builtin(position) position : vec4<f32>,
    // @location(0) color : vec3<f32>,
};

@binding(0) @group(0) var<uniform> wvp : mat4x4<f32>;

@vertex
fn VS(in : VSIn) -> VSOut {
    var out : VSOut;
    out.position = vec4<f32>(in.position, 1.0) * wvp;

    return out;
}

@fragment
fn FS() -> @location(0) vec4<f32> {
    return vec4<f32>(1.0, 0.0, 0.0, 1.0);
}`;
const shaderModule = device.createShaderModule({ code: shaderCode });
console.log(await shaderModule.getCompilationInfo());

const depthTexture = device.createTexture({
    size: [ canvas.width, canvas.height ],
    format: depthFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

const glb = await fetch('./models/Box.glb')
    .then(response => response.arrayBuffer())
    .then(buffer => new GLB(buffer));

const meshes = glb.json.meshes.map(mesh => new GLTFMesh(device, glb, mesh));

let translation = mat4x4.Translation(new vec3(0, 0, 0));
let scale = mat4x4.Scale(new vec3(1, 1, 1));
let rotation = mat4x4.RotationZ(deg2rad(0));
let world = rotation.mul(scale).mul(translation);

const eye = new vec3(0, 0, 2);
const at = new vec3(0, 0, 0);
const up = new vec3(0, 1, 0);
const view = mat4x4.LookAtRH(eye, at, up);

const projection = mat4x4.PerspectiveFovRH(deg2rad(90), canvas.width / canvas.height, 0.1, 100.0);

let wvp = world.mul(view).mul(projection);

const uniformBuffer = device.createBuffer({
    size: wvp.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
});
wvp.mapToBuffer(uniformBuffer);
uniformBuffer.unmap();

const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
        module: shaderModule,
        entryPoint: 'VS',
        buffers: [
            {
                arrayStride: Float32Array.BYTES_PER_ELEMENT * 3,
                attributes: [
                    {
                        format: 'float32x3',
                        offset: 0,
                        shaderLocation: 0,
                    },
                ],
            },
        ],
    },
    primitive: {
        cullMode: 'back',
    },
    depthStencil: {
        format: depthFormat,
        depthWriteEnabled: true,
        depthCompare: 'greater-equal'
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

const bindGroup = device.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
        {
            binding: 0,
            resource: {
                buffer: uniformBuffer,
            },   
        },
    ],    
});

let start;
let prev;

function frame(timestamp) {
    if (!start){
        start = timestamp;
        prev = start;
    }
    const elapsed = timestamp - start;
    const delta = timestamp - prev;
    prev = timestamp;

    rotation = mat4x4.RotationX(elapsed / 1000).mul(mat4x4.RotationY(elapsed / 1000));
    world = rotation.mul(scale).mul(translation);

    wvp = world.mul(view).mul(projection);

    device.queue.writeBuffer(
        uniformBuffer,
        0,
        wvp.buffer,
        0,
        wvp.byteLength
    );

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
    renderPass.setBindGroup(0, bindGroup);
    meshes.forEach(mesh => mesh.draw(renderPass));
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
}
frame();