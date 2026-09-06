import * as THREE from "three";

export function createLandscape(host) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0, 0);
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
  camera.position.z = 5;
  const geometry = new THREE.PlaneGeometry(1, 1);
  const textures = [];
  const layers = [];
  let disposed = false;
  let ready = false;
  let frame = 0;
  let width = 1;
  let height = 1;
  let progress = scrollProgress();
  let previousTime = 0;

  function scrollProgress() {
    return THREE.MathUtils.clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight), 0, 1);
  }

  function render(time) {
    frame = 0;
    if (disposed || !ready || document.hidden) return;
    const target = scrollProgress();
    const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16;
    previousTime = time;
    progress = THREE.MathUtils.lerp(progress, target, 1 - Math.exp(-elapsed / 110));
    for (const layer of layers) {
      layer.position.x = (0.5 - progress) * width * layer.userData.travel;
    }
    renderer.render(scene, camera);
    host.dataset.ready = "true";
    if (Math.abs(target - progress) > .0001) frame = requestAnimationFrame(render);
    else previousTime = 0;
  }

  function requestRender() {
    if (!frame && !disposed && ready && !document.hidden) frame = requestAnimationFrame(render);
  }

  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    renderer.setSize(width, height);
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height;
    camera.bottom = 0;
    camera.updateProjectionMatrix();
    for (const layer of layers) {
      const size = Math.max(width * 1.5, height * 3.5);
      // Bound the summit height on ultrawide screens so its peak stays inside the canvas.
      const h = Math.min(size / 3, height * 1.6);
      layer.scale.set(size, h, 1);
      layer.position.y = h / 2 + height * layer.userData.bottom;
    }
    requestRender();
  }

  function theme() {
    const style = getComputedStyle(document.documentElement);
    const ink = new THREE.Color(style.getPropertyValue("--text").trim());
    const dark = ink.r > .5;
    for (const layer of layers) {
      layer.material.uniforms.ink.value.copy(ink);
      layer.material.uniforms.night.value = dark ? 1 : 0;
    }
    requestRender();
  }

  function contextLost(event) {
    event.preventDefault();
    cleanup();
  }

  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(host);
  sizeObserver.observe(document.documentElement);
  const themeObserver = new MutationObserver(theme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const systemTheme = matchMedia("(prefers-color-scheme: dark)");
  systemTheme.addEventListener("change", theme);
  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", requestRender);
  renderer.domElement.addEventListener("webglcontextlost", contextLost);

  async function load() {
    const loader = new THREE.TextureLoader();
    const loadTexture = async (url) => {
      const texture = await loader.loadAsync(url);
      if (disposed) { texture.dispose(); return null; }
      textures.push(texture);
      return texture;
    };
    try {
      const [summit, foothills] = await Promise.all([
        loadTexture("/assets/mountains/summit.webp"),
        loadTexture("/assets/mountains/foothills.webp"),
      ]);
      if (disposed) return;
      for (const [texture, travel, bottom, opacity] of [
        [foothills, .06, 0, .32],
        [summit, .22, -.22, .85],
        [foothills, .38, -.18, .65],
      ]) {
        const material = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          uniforms: { map: { value: texture }, ink: { value: new THREE.Color() }, night: { value: 0 }, strength: { value: opacity } },
          vertexShader: `varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: `uniform sampler2D map; uniform vec3 ink; uniform float night; uniform float strength; varying vec2 vUv;
            void main() {
              vec4 texel = texture2D(map, vUv);
              float value = dot(texel.rgb, vec3(.299, .587, .114));
              float detail = mix(1.0 - value, .3 + .7 * value, night);
              gl_FragColor = vec4(ink, texel.a * detail * strength);
              #include <colorspace_fragment>
            }`,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = layers.length - 2;
        mesh.renderOrder = layers.length;
        mesh.userData = { travel, bottom };
        layers.push(mesh);
        scene.add(mesh);
      }
      ready = true;
      theme();
      resize();
    } catch {
      cleanup();
    }
  }

  function cleanup() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    delete host.dataset.ready;
    sizeObserver.disconnect();
    themeObserver.disconnect();
    systemTheme.removeEventListener("change", theme);
    window.removeEventListener("scroll", requestRender);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", requestRender);
    renderer.domElement.removeEventListener("webglcontextlost", contextLost);
    layers.forEach((layer) => layer.material.dispose());
    textures.forEach((texture) => texture.dispose());
    geometry.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  load();
  return cleanup;
}
