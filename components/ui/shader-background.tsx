"use client";

import { useEffect, useRef } from "react";

// Animated WebGL nebula backdrop (21st.dev animated-shader-hero, recolored
// from orange/amber to the app's cyan/indigo grade and trimmed to a
// time-driven background — no pointer tracking). Renders nothing if WebGL
// is unavailable; the page's dark background remains as fallback.

const FRAG = `
precision highp float;
uniform vec2 resolution;
uniform float time;

float rnd(vec2 p) {
  p = fract(p * vec2(12.9898, 78.233));
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  float a = rnd(i), b = rnd(i + vec2(1, 0)), c = rnd(i + vec2(0, 1)), d = rnd(i + 1.);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float t = 0., a = 1.;
  mat2 m = mat2(1., -.5, .2, 1.2);
  for (int i = 0; i < 5; i++) {
    t += a * noise(p);
    p *= 2. * m;
    a *= .5;
  }
  return t;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - .5 * resolution) / min(resolution.x, resolution.y);
  vec2 st = uv * vec2(2., 1.);
  vec3 col = vec3(0.);
  float bg = fbm(vec2(st.x + time * .08, -st.y) * 2.);

  vec2 p = uv * (1. - .2 * (sin(time * .15) * .5 + .5));
  for (float i = 1.; i < 10.; i++) {
    p += .1 * cos(i * vec2(.12 + .01 * i, .8) + i * i + time * .3 + .1 * p.x);
    float d = length(p);
    // drifting cyan/indigo particles
    col += .00125 / d * (cos(sin(i) * vec3(3., 2.2, 1.)) + 1.);
    float b = noise(i + p + bg * 1.731);
    col += .0018 * b / length(max(p, vec2(b * p.x * .02, p.y)));
    // nebula tint: deep indigo lows, cyan highs
    col = mix(col, vec3(bg * .04, bg * .12, bg * .18), d);
  }

  gl_FragColor = vec4(col, 1.);
}`;

const VERT = `attribute vec2 position; void main() { gl_Position = vec4(position, 0., 1.); }`;

export function ShaderBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "resolution");
    const uTime = gl.getUniformLocation(program, "time");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const loop = (now: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, now * 1e-3);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className ?? "absolute inset-0 w-full h-full"} />;
}
