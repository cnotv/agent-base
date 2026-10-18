---
name: shaders
description: >-
  Use when writing, debugging, or optimizing shaders — "write a shader",
  "create a material", "make it glow", "add a fresnel effect", "fix the
  shader error", "optimize the fragment shader", "make a toon shader", "add
  parallax". Covers GLSL, HLSL, ShaderLab, node-based shaders, the rendering
  pipeline, lighting models, shader debugging, and procedural generation
  techniques including noise, FBM, SDFs, and atmospheric perspective.
---

# Shaders

Shaders are small programs that run on the GPU to compute the appearance of
each pixel. Writing them well means understanding the rendering pipeline,
the math of light, and the constraints of the target hardware.

## 1. Know the pipeline

| Stage              | What it does                                        |
| ------------------ | --------------------------------------------------- |
| Vertex             | Transforms vertices from model to clip space        |
| Tessellation       | Subdivides geometry (optional)                      |
| Geometry           | Generates or discards primitives (optional)         |
| Rasterization      | Converts primitives to fragments                    |
| Fragment (pixel)   | Computes the final colour of each pixel             |
| Post-processing    | Applies screen-space effects (bloom, tonemapping)   |

Shaders run in parallel across thousands of fragments. Branching is expensive;
loops must have a fixed or predictable iteration count.

## 2. Shader languages

| Language  | Where it runs                              |
| --------- | ------------------------------------------ |
| GLSL      | OpenGL, WebGL, Vulkan (via SPIR-V)         |
| HLSL      | Direct3D, Unity                             |
| ShaderLab | Unity's wrapper around HLSL                |
| Node-based| Blender, Unreal, Shader Graph (no code)    |

The math is the same across languages; only the syntax differs.

## 3. The lighting model

Most real-time shaders implement some variant of the **Cook-Torrance** or
**Lambert + Blinn-Phong** model:

```
final = diffuse + specular + ambient + emission
```

### Diffuse

- **Lambert**: `NdotL * lightColor` — simple, fast, good for matte surfaces.
- **Half-Lambert**: wraps the light around the surface for softer falloff.

### Specular

- **Blinn-Phong**: `pow(NdotH, shininess) * lightColor` — fast, classic.
- **GGX (Cook-Torrance)**: physically based, uses roughness and Fresnel.
  The standard for modern PBR.

### Fresnel

- Surfaces reflect more at grazing angles. Use a Fresnel term to add rim
  light or to modulate specular intensity.
- Schlick's approximation: `F0 + (1 - F0) * pow(1 - NdotV, 5)`.

## 4. Common shader effects

### Rim light

```glsl
float rim = 1.0 - max(dot(normal, viewDir), 0.0);
rim = pow(rim, rimPower);
color += rimColor * rim * rimIntensity;
```

### Fresnel

```glsl
float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 5.0);
color = mix(baseColor, reflectionColor, fresnel);
```

### Normal mapping

- Perturb the surface normal using a tangent-space normal map.
- `N = normalize(TBN * sampledNormal)` where TBN is the tangent-binormal-
  normal matrix.

### Parallax occlusion mapping

- Offset UV coordinates based on the height map and view direction.
- Steps through the height field to find the intersection, giving the
  illusion of depth without extra geometry.

### Subsurface scattering

- Approximate with wrap lighting: `max(0, (NdotL + wrap) / (1 + wrap))`.
- Or use a thickness map to modulate transmission.

## 5. Node-based shaders

In Blender, Unreal, or ShaderGraph:

- **Principled BSDF** (Blender) / **Default Lit** (Unreal) covers 90% of
  materials. Start there and only add custom nodes when needed.
- Use **texture coordinate** nodes (UV, object, world, generated) to drive
  mapping. Object or world coordinates are essential for triplanar mapping.
- **Mix** nodes blend between two inputs using a factor. Use them to combine
  detail masks, roughness variation, or colour variation.
- Keep node graphs organized: name nodes, use frames/comment groups, and
  avoid spaghetti.

## 6. Shader debugging

1. **Visualize intermediates** — output the normal, UV, depth, or a single
   colour channel as the final colour to see what is wrong.
2. **Check the math** — is the dot product normalized? Is the power function
   getting a value in [0, 1]?
3. **Simplify** — strip the shader down to a basic diffuse, then add terms
   back one at a time.
4. **Test on the target hardware** — a shader that works in the editor may
   fail on mobile or WebGL.
5. **Check precision** — mobile GPUs use lowp/mediump by default; explicit
   precision qualifiers prevent artifacts.

## 7. Performance

- **Minimize texture samples** — each sample costs bandwidth. Pack maps
  into shared channels (occlusion in R, roughness in G, metallic in B).
- **Avoid branching** where possible; use `mix()` and `step()` instead of
  `if`.
- **Use the lowest precision** that looks correct (half on mobile).
- **Reduce overdraw** — transparent shaders are expensive; use alpha test
  instead of alpha blend when possible.
- **LOD shaders** — use a simpler shader variant for distant objects.

## 8. GLSL language fundamentals

### Data types

| Type | Description |
|------|-------------|
| `int` | Integer |
| `float` | Floating-point (must include decimal: `10.0` not `10`) |
| `bool` | Boolean |
| `vec2`/`vec3`/`vec4` | 2/3/4-component float vectors |
| `mat2`/`mat3`/`mat4` | 2x2/3x3/4x4 float matrices (column-major) |
| `sampler2D` | 2D image data |

### Vector component access

Three interchangeable notations — choose by context:

- **Position**: `.x` `.y` `.z` `.w`
- **Color**: `.r` `.g` `.b` `.a`
- **Texture**: `.s` `.t` `.p` `.q`

### Storage qualifiers

| Qualifier | Scope | Use Case |
|-----------|-------|----------|
| `const` | Anywhere | Immutable values |
| `attribute` | Vertex only | Per-vertex data (position, UV) |
| `uniform` | Both shaders | Shared across all vertices (time, resolution) |
| `varying` | Vertex to Fragment | Interpolated data across fragments |

### Precision qualifiers

`lowp`, `mediump`, `highp` — set globally with `precision highp float;`

### Built-in functions

| Function | Description |
|----------|-------------|
| `mix(a, b, t)` | Linear interpolation |
| `smoothstep(e0, e1, x)` | Hermite interpolation (S-curve) |
| `texture2D(sampler, uv)` | Texture sampling |
| `dot(a, b)` | Dot product |
| `cross(a, b)` | Cross product |
| `normalize(v)` | Unit vector |
| `length(v)` | Vector magnitude |
| `fract(x)` | Fractional part |
| `pow(x, y)` | Exponentiation |
| `exp(x)` | e^x |

### Common pitfalls

- `float x = 10;` is an error — use `10.0`
- Passing raw pixel coords as color clamps to 1.0 — divide by resolution first
- Always normalize inputs to `dot()` and `pow()`

## 9. Procedural generation techniques

### Noise and Fractal Brownian Motion (FBM)

```glsl
float fbm(vec2 p) {
    float sum = 0.0;
    for (int i = 0; i < 8; i++) {
        sum += noise(p);
        p = p * 2.0 + offset;
        p = rotate(p, angle);
    }
    return sum;
}
```

Layer compressed + rotated noise at increasing frequencies for natural-looking terrain, clouds, and textures. Use Pythagorean triples (3-4-5, 8-15-17) for quick rotation matrices.

### Signed Distance Functions (SDFs)

- Return distance to nearest surface: `< 0` inside, `= 0` on surface, `> 0` outside
- Circle: `length(p) - r`
- Boolean logic: union = `min(a, b)`, intersection = `max(a, b)`, subtraction = `max(a, -b)`

### Atmospheric perspective

```glsl
float fogFactor = exp(-k * distance);
vec3 finalColor = mix(surfaceColor, skyColor, fogFactor);
```

Use different damping constants per RGB channel — blue scatters more, creating realistic aerial perspective.

### Surface normal from heightfield

```glsl
vec3 tangentX = vec3(1.0, dFdx, 0.0);
vec3 tangentZ = vec3(0.0, dFdz, 1.0);
vec3 normal = normalize(cross(tangentX, tangentZ));
float diffuse = max(dot(normal, sunDir), 0.0);
```

### Resolution-independent coordinates

```glsl
uniform vec2 u_resolution;
vec2 uv = gl_FragCoord.xy / u_resolution;
```

### Soft shadows via SDF

```glsl
float shadow = min(R, smoothstep(0.0, 1.0, R / T));
```

### Contrast curves with smoothstep

Apply smoothstep to final color for contrast adjustment — makes dark colors darker and bright colors brighter.

## 10. Naming conventions

- Uniforms: `u_time`, `u_resolution`, `u_mouse`
- Attributes: `a_position`, `a_textCoord`
- Varyings: `v_texCoord` or `st`

## Definition of done

The shader compiles without errors or warnings on the target platform, the visual output matches the intended effect (verified in the renderer, not just in code review), the math is correct (normalized inputs, correct colour space), the node graph is organized and named, and performance is acceptable for the target hardware.

## Sources

Content in sections 8-10 was extracted from the [Shaders playlist](https://www.youtube.com/playlist?list=PLsRZURHSo1vKy49Xg6Zu3s_gI_OO1rnmC) — a curated collection of shader programming tutorials by kishimisu, Wael Yasmina, Barney Codes, Inigo Quilez, and The Art of Code.
