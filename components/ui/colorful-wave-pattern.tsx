"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const fragmentShaderSource = `#version 300 es
precision highp float;
uniform float time;
uniform vec2 resolution;
out vec4 fragColor;

const float WAVE_COUNT = 3.0;
const float WAVE_AMPLITUDE = 0.2;
const float WAVE_FREQUENCY = 1.5;
const float BRIGHTNESS = 0.005;
const float COLOR_SEPARATION = 0.03;

float pattern(vec2 uv) {
  float intensity = 0.0;
  for (float i = 0.0; i < WAVE_COUNT; i++) {
    uv.x += sin(time * (1.0 + i) + uv.y * WAVE_FREQUENCY) * WAVE_AMPLITUDE;
    intensity += BRIGHTNESS / abs(uv.x);
  }
  return intensity;
}

vec3 scene(vec2 uv) {
  vec3 color = vec3(0.0);
  vec2 rotated_uv = vec2(uv.y, uv.x);
  for (float i = 0.0; i < WAVE_COUNT; i++) {
    int colorChannel = int(mod(i, 3.0));
    vec2 channel_uv = rotated_uv + vec2(0.0, i * COLOR_SEPARATION);
    color[colorChannel] += pattern(channel_uv);
  }
  return color;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.x, resolution.y);
  vec3 color = scene(uv);
  // Warm-shift: bias toward orange/amber to match the voice orb palette.
  color = vec3(color.r * 1.4 + color.g * 0.3, color.g * 0.7 + color.r * 0.4, color.b * 0.25);
  fragColor = vec4(color, 1.0);
}`;

const vertexShaderSource = `#version 300 es
precision highp float;
in vec4 position;
void main(){ gl_Position = position; }`;

class Renderer {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  program: WebGLProgram | null = null;
  uniforms: { resolution: WebGLUniformLocation | null; time: WebGLUniformLocation | null } | null = null;
  private vertices = [-1, 1, -1, -1, 1, 1, 1, -1];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2")!;
  }

  compile(type: number, src: string) {
    const s = this.gl.createShader(type)!;
    this.gl.shaderSource(s, src);
    this.gl.compileShader(s);
    if (!this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS)) {
      console.error("shader err", this.gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  init() {
    const vs = this.compile(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fs = this.compile(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return false;
    this.program = this.gl.createProgram()!;
    this.gl.attachShader(this.program, vs);
    this.gl.attachShader(this.program, fs);
    this.gl.linkProgram(this.program);
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) return false;

    const buf = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.vertices), this.gl.STATIC_DRAW);
    const pos = this.gl.getAttribLocation(this.program, "position");
    this.gl.enableVertexAttribArray(pos);
    this.gl.vertexAttribPointer(pos, 2, this.gl.FLOAT, false, 0, 0);

    this.uniforms = {
      resolution: this.gl.getUniformLocation(this.program, "resolution"),
      time: this.gl.getUniformLocation(this.program, "time"),
    };
    return true;
  }

  render(time = 0) {
    if (!this.program || !this.uniforms) return;
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(this.program);
    this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.uniforms.time, time * 1e-3);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}

type Props = Omit<React.ComponentProps<"canvas">, "ref">;

export function ColorfulWavePattern({ className, ...props }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new Renderer(canvas);
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      renderer.gl.viewport(0, 0, canvas.width, canvas.height);
    };

    if (renderer.init()) {
      resize();
      window.addEventListener("resize", resize);
      const animate = (t: number) => {
        renderer.render(t);
        raf = requestAnimationFrame(animate);
      };
      animate(0);
    }
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className={cn("pointer-events-none fixed inset-0 w-full h-full", className)} {...props} />;
}
