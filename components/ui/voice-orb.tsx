"use client";

import React, { useEffect, useRef, FC } from "react";
import { cn } from "@/lib/utils";

interface VoicePoweredOrbProps {
  className?: string;
  hue?: number;
  isActive?: boolean;
  callState?: "idle" | "connecting" | "listening" | "processing" | "speaking" | "ended" | "error";
}

export const VoicePoweredOrb: FC<VoicePoweredOrbProps> = ({
  className,
  hue = 0,
  isActive = false,
  callState = "idle",
}) => {
  const ctnDom = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>();

  // Map callState to visual parameters
  const stateConfig = {
    idle: { speed: 0.2, intensity: 0.0, hueShift: 0 },
    connecting: { speed: 0.5, intensity: 0.2, hueShift: 30 },
    listening: { speed: 0.8, intensity: 0.5, hueShift: 60 },
    processing: { speed: 1.2, intensity: 0.4, hueShift: 120 },
    speaking: { speed: 1.5, intensity: 0.8, hueShift: 200 },
    ended: { speed: 0.1, intensity: 0.0, hueShift: 0 },
    error: { speed: 0.3, intensity: 0.1, hueShift: -60 },
  };

  useEffect(() => {
    const container = ctnDom.current;
    if (!container) return;

    let canvas: HTMLCanvasElement;
    let gl: WebGLRenderingContext;
    let program: WebGLProgram;
    let startTime = Date.now();

    const vert = `
      precision highp float;
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const frag = `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float hue;
      uniform float intensity;
      uniform float speed;
      varying vec2 vUv;

      vec3 rgb2yiq(vec3 c){
        return vec3(dot(c,vec3(.299,.587,.114)),dot(c,vec3(.596,-.274,-.322)),dot(c,vec3(.211,-.523,.312)));
      }
      vec3 yiq2rgb(vec3 c){
        return vec3(c.x+.956*c.y+.621*c.z,c.x-.272*c.y-.647*c.z,c.x-1.106*c.y+1.703*c.z);
      }
      vec3 adjustHue(vec3 color,float h){
        float r=h*3.14159/180.;vec3 yiq=rgb2yiq(color);
        float i=yiq.y*cos(r)-yiq.z*sin(r);float q=yiq.y*sin(r)+yiq.z*cos(r);
        return yiq2rgb(vec3(yiq.x,i,q));
      }
      vec3 hash33(vec3 p){
        p=fract(p*vec3(.1031,.11369,.13787));p+=dot(p,p.yxz+19.19);
        return -1.+2.*fract(vec3(p.x+p.y,p.x+p.z,p.y+p.z)*p.zyx);
      }
      float snoise(vec3 p){
        const float K1=.333333333,K2=.166666667;
        vec3 i=floor(p+(p.x+p.y+p.z)*K1);vec3 d0=p-(i-(i.x+i.y+i.z)*K2);
        vec3 e=step(vec3(0.),d0-d0.yzx);vec3 i1=e*(1.-e.zxy);vec3 i2=1.-e.zxy*(1.-e);
        vec3 d1=d0-(i1-K2),d2=d0-(i2-K1),d3=d0-.5;
        vec4 h=max(.6-vec4(dot(d0,d0),dot(d1,d1),dot(d2,d2),dot(d3,d3)),0.);
        vec4 n=h*h*h*h*vec4(dot(d0,hash33(i)),dot(d1,hash33(i+i1)),dot(d2,hash33(i+i2)),dot(d3,hash33(i+1.)));
        return dot(vec4(31.316),n);
      }

      const vec3 c1=vec3(.612,.263,.996);
      const vec3 c2=vec3(.298,.761,.914);
      const vec3 c3=vec3(.063,.078,.600);

      void main(){
        vec2 uv=(vUv*2.-1.)*vec2(iResolution.x/iResolution.y,1.);
        float t=iTime*speed;
        float len=length(uv);
        float n=snoise(vec3(uv*.65,t*.5))*.5+.5;
        float r0=mix(.55,.95,n);
        float d0=distance(uv,(r0/len)*uv);
        float v0=1./(1.+10.*d0)*smoothstep(r0*1.05,r0,len);
        float cl=cos(atan(uv.y,uv.x)+t*2.)*.5+.5;
        vec2 pos=vec2(cos(-t),sin(-t))*r0;
        float v1=1.5/(1.+5.*distance(uv,pos))*v0;
        float v2=smoothstep(1.,mix(.55,.95,n*.5),len);
        float v3=smoothstep(.55,mix(.55,.95,.5),len);
        vec3 col=mix(adjustHue(c1,hue),adjustHue(c2,hue),cl);
        col=mix(adjustHue(c3,hue),col,v0);
        col=(col+v1)*v2*v3;
        col*=(1.+intensity*.5);
        col=clamp(col,0.,1.);
        float a=max(max(col.r,col.g),col.b);
        gl_FragColor=vec4(col/max(a,1e-5)*a,a);
      }
    `;

    const compile = (src: string, type: number) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    try {
      canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      while (container.firstChild) container.removeChild(container.firstChild);
      container.appendChild(canvas);

      gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true })!;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);

      program = gl.createProgram()!;
      gl.attachShader(program, compile(vert, gl.VERTEX_SHADER));
      gl.attachShader(program, compile(frag, gl.FRAGMENT_SHADER));
      gl.linkProgram(program);
      gl.useProgram(program);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const pos = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

      const resize = () => {
        const w = container!.clientWidth;
        const h = container!.clientHeight;
        canvas.width = w * devicePixelRatio;
        canvas.height = h * devicePixelRatio;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        gl.viewport(0, 0, canvas.width, canvas.height);
      };
      resize();
      window.addEventListener("resize", resize);

      const render = () => {
        animRef.current = requestAnimationFrame(render);
        const cfg = stateConfig[callState] ?? stateConfig.idle;
        const t = (Date.now() - startTime) * 0.001;
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(gl.getUniformLocation(program, "iTime"), t);
        gl.uniform2f(gl.getUniformLocation(program, "iResolution"), canvas.width, canvas.height);
        gl.uniform1f(gl.getUniformLocation(program, "hue"), hue + cfg.hueShift);
        gl.uniform1f(gl.getUniformLocation(program, "intensity"), cfg.intensity);
        gl.uniform1f(gl.getUniformLocation(program, "speed"), cfg.speed);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      render();

      return () => {
        cancelAnimationFrame(animRef.current!);
        window.removeEventListener("resize", resize);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        if (container.contains(canvas)) container.removeChild(canvas);
      };
    } catch (e) {
      console.error("WebGL init failed", e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, hue, isActive]);

  return (
    <div
      ref={ctnDom}
      className={cn("w-full h-full relative rounded-full overflow-hidden", className)}
    />
  );
};
