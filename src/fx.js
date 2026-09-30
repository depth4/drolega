// Post-processing: drunk vision (double image, wobble), vignette, blackout.
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const DrunkShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uDrunk: { value: 0 }, uBlack: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uDrunk, uBlack;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv + uDrunk * 0.006 * vec2(sin(vUv.y * 12.0 + uTime * 1.7), cos(vUv.x * 10.0 + uTime * 1.3));
      vec2 off = uDrunk * 0.02 * vec2(sin(uTime * 0.9), cos(uTime * 0.7));
      vec4 a = texture2D(tDiffuse, uv);
      vec4 b = texture2D(tDiffuse, uv + off);
      vec4 c = texture2D(tDiffuse, uv - off * 0.6);
      vec4 col = mix(a, (a + b + c) / 3.0, clamp(uDrunk * 1.3, 0.0, 1.0));
      float d = distance(vUv, vec2(0.5));
      col.rgb *= 1.0 - smoothstep(0.3, 0.85, d) * (0.3 + uDrunk * 0.6);
      col.rgb *= 1.0 - uBlack;
      gl_FragColor = col;
    }`,
};

export function makeFX(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const drunk = new ShaderPass(DrunkShader);
  composer.addPass(drunk);
  composer.addPass(new OutputPass());
  return {
    composer,
    set(time, drunkAmount, black) {
      drunk.uniforms.uTime.value = time;
      drunk.uniforms.uDrunk.value = drunkAmount;
      drunk.uniforms.uBlack.value = black;
    },
    setSize(w, h) {
      composer.setSize(w, h);
    },
    render() {
      composer.render();
    },
  };
}
