/* An original parametric sculpture. Scroll, a slow idle clock, dragging, and the pointer drive it. */
const vertexSource = `
precision highp float;
attribute vec2 aParameter;
uniform float uProgress;
uniform float uReveal;
uniform float uSpin;
uniform float uFlow;
uniform vec2 uTilt;
uniform vec2 uPointer;
uniform float uSwell;
uniform vec2 uViewport;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec2 vParameter;
varying float vGrowth;
const float PI = 3.141592653589793;
const float TAPER = 1.4;

vec3 centerline(float t) {
  float minorRadius = .385 + .025 * sin(uProgress * PI);
  float ring = 1.02 + minorRadius * cos(3.0 * t);
  return vec3(ring * cos(2.0 * t), ring * sin(2.0 * t), minorRadius * sin(3.0 * t));
}

// The strand grows along its length on entry, ending in a tapered tip rather than an open tube.
float growth(float t) {
  float head = uReveal * (2.0 * PI + TAPER);
  float g = clamp((head - t) / TAPER, 0.0, 1.0);
  return g * g * (3.0 - 2.0 * g);
}

vec3 pose(vec3 p) {
  float ax = .69 + uProgress * .12 + uTilt.y;
  float ay = -.33 + uProgress * 1.6 + uTilt.x;
  float az = -.26 + uProgress * .32;
  p.yz = mat2(cos(ax), sin(ax), -sin(ax), cos(ax)) * p.yz;
  p.xz = mat2(cos(ay), -sin(ay), sin(ay), cos(ay)) * p.xz;
  p.xy = mat2(cos(az), sin(az), -sin(az), cos(az)) * p.xy;
  return p;
}

vec2 fitToViewport() {
  float shortSide = min(uViewport.x, uViewport.y);
  return vec2(shortSide / uViewport.x, shortSide / uViewport.y) / 1.98;
}

// The strand swells where it passes under the cursor, like a lens over the chrome.
float swellAt(vec3 centre) {
  if (uSwell <= 0.0) return 0.0;
  vec3 q = pose(centre * vec3(1.12, 1.05, 1.0));
  float perspective = 5.8 / (5.8 - q.z * .3);
  vec2 offset = q.xy * perspective - uPointer / fitToViewport();
  return uSwell * exp(-dot(offset, offset) / .16);
}

vec3 surface(vec2 uv) {
  float t = uv.x;
  float v = uv.y;
  vec3 c = centerline(t);
  vec3 tangent = normalize(centerline(t + .0008) - centerline(t - .0008));
  vec3 outward = normalize(cross(tangent, vec3(0.0, 0.0, 1.0)));
  vec3 binormal = normalize(cross(tangent, outward));
  // A slowly travelling twist rolls the oval cross-section along the strand.
  float twist = t + .14 * sin(3.0 * t) + uProgress * .13 + uFlow;
  vec3 n = outward * cos(twist) + binormal * sin(twist);
  vec3 b = -outward * sin(twist) + binormal * cos(twist);
  mat2 spin = mat2(cos(uSpin), sin(uSpin), -sin(uSpin), cos(uSpin));
  vec3 centre = c;
  centre.xy = spin * centre.xy;
  float radius = (.177 + .012 * sin(3.0 * t + .5)) * max(growth(t), .002) * (1.0 + .8 * swellAt(centre));
  c += radius * (n * cos(v) + b * sin(v) * .69);
  c.xy = spin * c.xy;
  return c * vec3(1.12, 1.05, 1.0);
}

void main() {
  vec2 uv = aParameter;
  vec3 p = surface(uv);
  vec3 du = surface(uv + vec2(.0008, 0.0)) - surface(uv - vec2(.0008, 0.0));
  vec3 dv = surface(uv + vec2(0.0, .001)) - surface(uv - vec2(0.0, .001));
  vPosition = pose(p);
  vNormal = normalize(pose(normalize(cross(dv, du))));
  vTangent = normalize(pose(du));
  vParameter = uv;
  vGrowth = growth(uv.x);
  vec2 fit = fitToViewport();
  // A long product lens gives depth without making the front strand loom.
  float perspective = 5.8 / (5.8 - vPosition.z * .3);
  gl_Position = vec4(vPosition.xy * fit * perspective, -vPosition.z * .18, 1.0);
}
`;

const fragmentSource = `
precision highp float;
uniform float uLight;
uniform float uDark;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec2 vParameter;
varying float vGrowth;

// A photography studio: dark floor, bright sky, softboxes, a black flag, and one card in the site's blue.
// The dark theme dims the room but keeps the softboxes, so the chrome reads as polished black.
// Everything is procedural, so the sculpture does not download an environment map.
vec3 studio(vec3 r) {
  // Turning the studio, not the object, sweeps highlights across the chrome.
  float c = cos(uLight);
  float s = sin(uLight);
  r.xz = mat2(c, -s, s, c) * r.xz;
  vec3 floorTone = mix(vec3(.15, .165, .2), vec3(.03, .035, .045), uDark);
  vec3 sky = mix(vec3(.92, .935, .965), vec3(.34, .37, .44), uDark);
  vec3 light = mix(floorTone, sky, smoothstep(-.22, .3, r.y));
  light += mix(vec3(.2, .21, .23), vec3(.1, .11, .14), uDark) * exp(-pow(r.y * 6.0, 2.0));
  float flag = exp(-pow((r.x + .14) * 5.5, 2.0)) * smoothstep(-.35, .45, r.z) * smoothstep(-.1, .35, r.y);
  light *= 1.0 - .62 * flag;
  float strip = exp(-pow((r.x - .56) * 9.0, 2.0)) * smoothstep(-.5, .35, r.z);
  float tallBox = pow(max(dot(r, normalize(vec3(-.8, .6, .7))), 0.0), 22.0);
  float topBox = pow(max(dot(r, normalize(vec3(.3, 1.0, .25))), 0.0), 9.0);
  light += vec3(.7) * strip + vec3(.95, .95, .93) * tallBox + vec3(.32) * topBox;
  float blueCard = exp(-pow((r.x + .6) * 3.4, 2.0)) * smoothstep(.1, -.5, r.y);
  light += mix(vec3(.05, .09, .27), vec3(.12, .2, .62), uDark) * blueCard;
  return light;
}

void main() {
  if (vGrowth < .01) discard;
  vec3 n = normalize(vNormal);
  vec3 view = normalize(vec3(0.0, 0.0, 7.5) - vPosition);
  vec3 reflected = reflect(-view, n);
  vec3 tangent = normalize(vTangent);
  // The broad and narrow samples soften reflections along the brushed direction.
  vec3 environment = studio(reflected) * .7;
  environment += studio(normalize(reflected + tangent * .06)) * .15;
  environment += studio(normalize(reflected - tangent * .06)) * .15;
  float fresnel = pow(1.0 - max(dot(view, n), 0.0), 5.0);
  vec3 silver = mix(vec3(.9, .92, .95), vec3(1.0), fresnel);
  vec3 color = environment * silver;
  float key = max(dot(n, normalize(vec3(-.5, .85, 1.0))), 0.0);
  color += vec3(.04) * key;
  // A quiet machining grain keeps the polish from looking like plastic.
  float grain = sin(vParameter.x * 1130.0 + sin(vParameter.y * 53.0) * 2.0);
  color *= 1.0 + grain * .006;
  color = color / (vec3(1.0) + color * .22);
  color = pow(max(color, vec3(0.0)), vec3(.86));
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

const restingPose = { progress: 0, reveal: 1, spin: 0, flow: 0, light: 0, dark: 0, swell: 0, tilt: [0, 0], pointer: [0, 0] };
const finite = (value, fallback) => (Number.isFinite(value) ? value : fallback);

/** Create a dependency-free WebGL sculpture, preserving the SVG on failure. */
export function createSculpture(canvas) {
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  const parent = canvas.closest('.sculpture-wrap');
  const revealFallback = () => {
    canvas.classList.remove('is-ready');
    parent?.classList.remove('has-webgl');
  };
  let gl;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: true,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    });
  } catch {
    revealFallback();
    return null;
  }
  if (!gl) {
    revealFallback();
    return null;
  }

  let resources = null;
  let contextLost = false;
  let current = { ...restingPose };

  function initialize() {
    const shaders = [];
    let program;
    let parameterBuffer;
    let indexBuffer;
    try {
      for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
        const shader = gl.createShader(type);
        if (!shader) throw new Error('Shader allocation failed');
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
      }
      program = gl.createProgram();
      if (!program) throw new Error('Program allocation failed');
      shaders.forEach(shader => gl.attachShader(program, shader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader linking failed');

      const aroundKnot = 256;
      const aroundTube = 128;
      const parameters = new Float32Array((aroundKnot + 1) * (aroundTube + 1) * 2);
      const indices = new Uint16Array(aroundKnot * aroundTube * 6);
      let offset = 0;
      for (let u = 0; u <= aroundKnot; u++) {
        for (let v = 0; v <= aroundTube; v++) {
          parameters[offset++] = u / aroundKnot * Math.PI * 2;
          parameters[offset++] = v / aroundTube * Math.PI * 2;
        }
      }
      offset = 0;
      for (let u = 0; u < aroundKnot; u++) {
        for (let v = 0; v < aroundTube; v++) {
          const a = u * (aroundTube + 1) + v;
          const b = a + aroundTube + 1;
          indices[offset++] = a;
          indices[offset++] = a + 1;
          indices[offset++] = b;
          indices[offset++] = b;
          indices[offset++] = a + 1;
          indices[offset++] = b + 1;
        }
      }
      parameterBuffer = gl.createBuffer();
      indexBuffer = gl.createBuffer();
      if (!parameterBuffer || !indexBuffer) throw new Error('Buffer allocation failed');
      gl.bindBuffer(gl.ARRAY_BUFFER, parameterBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, parameters, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      return {
        program,
        parameterBuffer,
        indexBuffer,
        count: indices.length,
        parameter: gl.getAttribLocation(program, 'aParameter'),
        progress: gl.getUniformLocation(program, 'uProgress'),
        reveal: gl.getUniformLocation(program, 'uReveal'),
        spin: gl.getUniformLocation(program, 'uSpin'),
        flow: gl.getUniformLocation(program, 'uFlow'),
        tilt: gl.getUniformLocation(program, 'uTilt'),
        light: gl.getUniformLocation(program, 'uLight'),
        dark: gl.getUniformLocation(program, 'uDark'),
        swell: gl.getUniformLocation(program, 'uSwell'),
        pointer: gl.getUniformLocation(program, 'uPointer'),
        viewport: gl.getUniformLocation(program, 'uViewport'),
      };
    } catch {
      if (program) gl.deleteProgram(program);
      if (parameterBuffer) gl.deleteBuffer(parameterBuffer);
      if (indexBuffer) gl.deleteBuffer(indexBuffer);
      return null;
    } finally {
      shaders.forEach(shader => gl.deleteShader(shader));
    }
  }

  /** Draw one frame. Omitted fields keep their previous values. */
  function draw(pose = {}) {
    const tilt = Array.isArray(pose.tilt) ? pose.tilt : current.tilt;
    const pointer = Array.isArray(pose.pointer) ? pose.pointer : current.pointer;
    current = {
      progress: Math.max(0, Math.min(1, finite(pose.progress, current.progress))),
      reveal: Math.max(0, Math.min(1, finite(pose.reveal, current.reveal))),
      spin: finite(pose.spin, current.spin),
      flow: finite(pose.flow, current.flow),
      light: finite(pose.light, current.light),
      dark: Math.max(0, Math.min(1, finite(pose.dark, current.dark))),
      swell: Math.max(0, Math.min(1, finite(pose.swell, current.swell))),
      tilt: [finite(tilt[0], 0), finite(tilt[1], 0)],
      pointer: [finite(pointer[0], 0), finite(pointer[1], 0)],
    };
    if (contextLost || !resources || gl.isContextLost()) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.useProgram(resources.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, resources.parameterBuffer);
    gl.enableVertexAttribArray(resources.parameter);
    gl.vertexAttribPointer(resources.parameter, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, resources.indexBuffer);
    gl.uniform1f(resources.progress, current.progress);
    gl.uniform1f(resources.reveal, current.reveal);
    gl.uniform1f(resources.spin, current.spin);
    gl.uniform1f(resources.flow, current.flow);
    gl.uniform2f(resources.tilt, current.tilt[0], current.tilt[1]);
    gl.uniform1f(resources.light, current.light);
    gl.uniform1f(resources.dark, current.dark);
    gl.uniform1f(resources.swell, current.swell);
    gl.uniform2f(resources.pointer, current.pointer[0], current.pointer[1]);
    gl.uniform2f(resources.viewport, width, height);
    gl.drawElements(gl.TRIANGLES, resources.count, gl.UNSIGNED_SHORT, 0);
    if (!gl.isContextLost()) {
      canvas.classList.add('is-ready');
      parent?.classList.add('has-webgl');
    }
  }

  resources = initialize();
  if (!resources) {
    revealFallback();
    return null;
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    resources = null;
    revealFallback();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    resources = initialize();
    if (resources) draw();
    else revealFallback();
  });

  return { draw };
}
