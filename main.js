import { mat4x4 } from './mat4x4.js';
import { vec3 } from './vec3.js';
import { GLB } from './glb.js';
import { GLTFImage } from './GLTFImage.js';
import { GLTFTexture } from './GLTFTexture.js';
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
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
};

struct VSOut {
    @builtin(position) position : vec4<f32>,
    @location(0) normal : vec3<f32>,
    @location(1) uv : vec2<f32>,
};

struct Scene {
    w : mat4x4<f32>,
    vp : mat4x4<f32>,
};
struct DirectionalLight {
    direction : vec3<f32>,
    color : vec3<f32>,
};

@binding(0) @group(0) var<uniform> scene : Scene;
@binding(1) @group(0) var<uniform> light : DirectionalLight;
@binding(2) @group(0) var tex : texture_2d<f32>;
@binding(3) @group(0) var smp : sampler;

@vertex
fn VS(in : VSIn) -> VSOut {
    var position = vec4<f32>(in.position, 1.0) * scene.w;

    var out : VSOut;
    out.position = position * scene.vp;
    out.normal = (vec4<f32>(in.normal, 0.0) * scene.w).xyz;
    out.uv = in.uv;

    return out;
}

@fragment
fn FS(@location(0) normal : vec3<f32>, @location(1) uv : vec2<f32>) -> @location(0) vec4<f32> {
    var lightDir = light.direction;
    var diffuse = max(dot(normal, lightDir), 0.0);
    return textureSample(tex, smp, uv) * vec4<f32>(light.color * diffuse, 1.0);
}`;
const shaderModule = device.createShaderModule({ code: shaderCode });
console.log(await shaderModule.getCompilationInfo());

const depthTexture = device.createTexture({
    size: [ canvas.width, canvas.height ],
    format: depthFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

const glb = await fetch('./models/DamagedHelmet.glb')
    .then(response => response.arrayBuffer())
    .then(buffer => new GLB(buffer));
console.log(glb);

const images = await Promise.all(glb.json.images.map(image => GLTFImage.load(glb, image)));
const textures = glb.json.textures.map(texture => new GLTFTexture(device, images, texture));
const meshes = glb.json.meshes.map(mesh => new GLTFMesh(device, glb, mesh));

let translation = mat4x4.Translation(new vec3(0, 0, 0));
let scale = mat4x4.Scale(new vec3(1, 1, 1));
let rotation = mat4x4.RotationY(deg2rad(0));
let world = rotation.mul(scale).mul(translation);

const eye = new vec3(0, 0, 3);
const at = new vec3(0, 0, 0);
const up = new vec3(0, 1, 0);
const view = mat4x4.LookAtRH(eye, at, up);

const projection = mat4x4.PerspectiveFovRH(deg2rad(90), canvas.width / canvas.height, 0.1, 100.0);

let vp = view.mul(projection);

const light = {
    direction: new vec3(0, 0, 1).normalize(),
    color: new vec3(1, 1, 1),
};

const uniformBuffer = {
    scene: device.createBuffer({
        size: world.byteLength + vp.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
    light: device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
}

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
            {
                arrayStride: Float32Array.BYTES_PER_ELEMENT * 3,
                attributes: [
                    {
                        format: 'float32x3',
                        offset: 0,
                        shaderLocation: 1,
                    },
                ],
            },
            {
                arrayStride: Float32Array.BYTES_PER_ELEMENT * 2,
                attributes: [
                    {
                        format: 'float32x2',
                        offset: 0,
                        shaderLocation: 2,
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

const sampler = device.createSampler({
    addressModeU: 'repeat',
    addressModeV: 'repeat',
});

const bindGroup = device.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
        {
            binding: 0,
            resource: {
                buffer: uniformBuffer.scene,
                offset: 0,
                size: world.byteLength + vp.byteLength,
            },   
        },
        {
            binding: 1,
            resource: {
                buffer: uniformBuffer.light,
                offset: 0,
                size: 32,
            },
        },
        {
            binding: 2,
            resource: textures[0].view,
        },
        {
            binding: 3,
            resource: sampler,
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

    rotation = mat4x4.RotationX(deg2rad(90)).mul(mat4x4.RotationY(elapsed/1000));
    world = rotation.mul(scale).mul(translation);

    let bufferOffset = 0;
    device.queue.writeBuffer(
        uniformBuffer.scene,
        bufferOffset,
        world.buffer,
        0,
        world.byteLength
    );
    bufferOffset += world.byteLength;
    device.queue.writeBuffer(
        uniformBuffer.scene,
        bufferOffset,
        vp.buffer,
        0,
        vp.byteLength
    );
    device.queue.writeBuffer(
        uniformBuffer.light,
        0,
        new Float32Array([
            light.direction.x,
            light.direction.y,
            light.direction.z,
            0,
            light.color.x,
            light.color.y,
            light.color.z,
            0,
        ])
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