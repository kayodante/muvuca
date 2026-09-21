"use client";

import { useEffect, useRef } from "react";

const vertexShaderGLSL = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Quad fullscreen: é a geometria que o Auralis original já usava. O DarkVeil
// (via `Triangle` do ogl) usava o truque do triângulo gigante, mas o shader dele
// lê gl_FragCoord, não vUv, então é indiferente à geometria — já o grão do
// Auralis depende de vUv bit a bit, e só o quad reproduz o valor de antes.
const FULLSCREEN_QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

/** `number` vira `float`; `number[]` vira `vec3` (ou array de vec3) achatado. */
type UniformValue = number | number[];

interface ShaderCanvasProps {
  /** Fragment shader. Recebe `u_resolution` (px CSS), `u_time` (s) e `vUv`. */
  fragment: string;
  uniforms?: Record<string, UniformValue>;
  /** Multiplicador de `u_time`. */
  speed?: number;
  /** Teto de `devicePixelRatio` do drawing buffer. */
  maxDpr?: number;
  /** Fração do tamanho CSS usada no drawing buffer — corta custo de GPU. */
  resolutionScale?: number;
  className?: string;
}

/**
 * Host de canvas WebGL: contexto, triângulo fullscreen, resize e loop de rAF.
 * Cada background (DarkVeil, Auralis) entra só com seu fragment e uniforms.
 *
 * Mede o elemento pai, então o pai precisa ter tamanho próprio.
 */
export function ShaderCanvas({
  fragment,
  uniforms,
  speed = 1,
  maxDpr = 2,
  resolutionScale = 1,
  className,
}: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Uniforms mudam sem recriar o contexto: o loop lê sempre o valor atual.
  const uniformsRef = useRef(uniforms);
  useEffect(() => {
    uniformsRef.current = uniforms;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const vertShader = createShader(gl.VERTEX_SHADER, vertexShaderGLSL);
    const fragShader = createShader(gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    if (!vertShader || !fragShader || !program) return;

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_QUAD, gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const locations = new Map<string, WebGLUniformLocation | null>();
    const locate = (name: string) => {
      if (!locations.has(name)) {
        locations.set(name, gl.getUniformLocation(program, name));
      }
      return locations.get(name) ?? null;
    };

    const draw = (elapsed: number) => {
      gl.uniform1f(locate("u_time"), elapsed * speed);
      for (const [name, value] of Object.entries(uniformsRef.current ?? {})) {
        if (typeof value === "number") gl.uniform1f(locate(name), value);
        else gl.uniform3fv(locate(name), value);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    // prefers-reduced-motion: um frame estático em vez de rAF eterno.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const resize = () => {
      const width = parent.clientWidth || window.innerWidth;
      const height = parent.clientHeight || window.innerHeight;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      canvas.width = Math.max(1, width * resolutionScale * dpr);
      canvas.height = Math.max(1, height * resolutionScale * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(locate("u_resolution"), width, height);
      // Sob reduced motion o loop nunca roda, então resize é o único lugar que
      // repinta — sem isso o fundo fica preto a cada resize.
      if (reduceMotion) draw(0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    resize();

    const start = performance.now();
    let frame = 0;
    const loop = () => {
      draw((performance.now() - start) / 1000);
      frame = requestAnimationFrame(loop);
    };

    if (reduceMotion) draw(0);
    else loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteShader(vertShader);
      gl.deleteShader(fragShader);
      gl.deleteProgram(program);
    };
  }, [fragment, speed, maxDpr, resolutionScale]);

  return <canvas ref={canvasRef} className={className} />;
}
