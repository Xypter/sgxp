<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';

  // The geometry (font parsing + TextGeometry extrusion + edge/outline computation)
  // is pre-built offline by scripts/generate-logo-geometry.mjs and committed as a
  // static asset, instead of redone in every visitor's browser on every page load.
  // Rerun that script (and update this path) if the logo's text or font ever changes.
  let { geometryUrl = "/models/sprites-logo.json" } = $props();

  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;

  // Three.js global variables
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let textMesh: THREE.Mesh;
  let outlineMesh: THREE.LineSegments;
  let animationId: number;
  let isVisible = true;
  let destroyed = false;

  // Rainbow speed in uTime units per second. Was a fixed `+= 0.01` per frame, which
  // made the animation speed (and the GPU work) scale with the monitor's refresh rate -
  // 0.6/sec is that same speed at the 60Hz it was designed on.
  const RAINBOW_SPEED = 0.6;
  // Cap rendering at 60fps - high-refresh monitors (120/144/240Hz) otherwise redraw the
  // whole scene 2-4x as often for no visible benefit.
  const FRAME_INTERVAL_MS = 1000 / 60;
  let startTime: number | undefined;
  let lastRenderTime = 0;
  let intersectionObserver: IntersectionObserver | undefined;

  // The logo's real-world size (the geometry) is fixed, but the container it sits in
  // can be any width down to the 768px mobile breakpoint (below which SpriteBrowser
  // stops rendering this component entirely in favor of plain text). Since the camera's
  // FOV/aspect approach doesn't shrink the text itself as the container narrows - it
  // just narrows the horizontal frustum and clips the text - we scale the mesh down
  // directly based on container width instead.
  const LOGO_SCALE_REFERENCE_WIDTH = 900; // container width at/above which the logo renders at full (1.0) scale
  const LOGO_MIN_SCALE = 0.55; // never shrink smaller than this before the mobile breakpoint takes over
  function computeLogoScale(width: number): number {
    return Math.min(1, Math.max(LOGO_MIN_SCALE, width / LOGO_SCALE_REFERENCE_WIDTH));
  }

  // Shader for the Moving Rainbow Outline
  const rainbowVertexShader = `
    varying float vLineDistance;
    attribute float lineDistance; // Provided by Three.js setup
    void main() {
      vLineDistance = lineDistance;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const rainbowFragmentShader = `
    uniform float uTime;
    varying float vLineDistance;

    vec3 getCustomGradient(float t) {
      vec3 c1 = vec3(0.0, 0.188, 0.286);   // #003049
      vec3 c2 = vec3(0.839, 0.157, 0.157); // #d62828
      vec3 c3 = vec3(0.969, 0.498, 0.0);   // #f77f00
      vec3 c4 = vec3(0.988, 0.749, 0.286); // #fcbf49
      vec3 c5 = vec3(0.918, 0.886, 0.718); // #eae2b7

      float x = fract(t);
      float segment = x * 5.0;
      if (segment < 1.0) return mix(c1, c2, segment);
      if (segment < 2.0) return mix(c2, c3, segment - 1.0);
      if (segment < 3.0) return mix(c3, c4, segment - 2.0);
      if (segment < 4.0) return mix(c4, c5, segment - 3.0);
      return mix(c5, c1, segment - 4.0);
    }

    void main() {
      // vLineDistance is the length along the path
      // We divide by a factor (e.g., 50.0) to control how many color cycles
      // appear along the perimeter of a letter.
      float travelProgress = (vLineDistance / 50.0) + (uTime * 0.5);

      vec3 color = getCustomGradient(travelProgress);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const shaderUniforms = {
    uTime: { value: 0 }
  };

  onMount(() => {
    initThree();
    loadGeometry();
    window.addEventListener('resize', onWindowResize);

    // The canvas is only ever visible inside a 200px-tall header strip, so pause the
    // render loop entirely while it's scrolled off-screen (still cheap to keep the
    // rAF loop alive so it resumes instantly - just skip the actual GPU work).
    intersectionObserver = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting; },
      { threshold: 0 }
    );
    intersectionObserver.observe(container);
  });

  onDestroy(() => {
    destroyed = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animationId);
      intersectionObserver?.disconnect();
      // Clean up Three.js resources. This component is unmounted/remounted every time
      // a sprite is opened/closed in SpriteBrowser - renderer.dispose() alone does NOT
      // release the underlying WebGL context, so without forceContextLoss() every
      // round-trip leaked one (plus its GPU buffers) until Chrome started warning
      // "Too many active WebGL contexts" and evicting old ones.
      scene?.traverse((obj) => {
        const { geometry, material } = obj as THREE.Mesh;
        geometry?.dispose();
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
      renderer?.dispose();
      renderer?.forceContextLoss();
    }
  });

  function getRenderSize() {
    // Render at the actual visible canvas size (a 200px-tall strip), not the full
    // browser window - the old code rendered a full window-sized scene every frame
    // even though only a small clipped strip of it was ever shown, which was the
    // single biggest GPU cost here.
    const rect = container.getBoundingClientRect();
    return { width: rect.width || window.innerWidth, height: rect.height || 200 };
  }

  // The canvas only needs to be as wide as the text itself (plus a little breathing
  // room), not the full container width - everything outside the text was empty
  // transparent pixels being redrawn every frame. Because the camera's FOV is vertical
  // and the canvas height is fixed, narrowing the canvas only crops the sides; the text
  // stays exactly the same size, and the container's flex centering keeps it in place.
  const CANVAS_SIDE_PADDING_PX = 24;
  function computeCanvasWidth(containerWidth: number, height: number): number {
    if (!textMesh) return containerWidth;
    textMesh.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(textMesh);
    const pxPerUnitAtUnitDepth = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    let maxHalfWidthPx = 0;
    const corner = new THREE.Vector3();
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
          const depth = -corner.z;
          if (depth > 0) {
            maxHalfWidthPx = Math.max(maxHalfWidthPx, Math.abs(corner.x) * pxPerUnitAtUnitDepth / depth);
          }
        }
      }
    }
    return Math.min(containerWidth, Math.ceil(maxHalfWidthPx * 2 + CANVAS_SIDE_PADDING_PX * 2));
  }

  function applyCanvasSize() {
    const { width: containerWidth, height } = getRenderSize();
    textMesh?.scale.setScalar(computeLogoScale(containerWidth));
    const width = computeCanvasWidth(containerWidth, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function initThree() {
    scene = new THREE.Scene();

    const { width, height } = getRenderSize();

    // Set up Camera
    // NOTE: fov was 45 back when the renderer was (accidentally) sized to the whole
    // browser window and only the middle 200px sliver was ever shown through
    // .three-container's overflow:hidden - that crop was acting as a huge, viewport-height-
    // dependent zoom. Now that the renderer is correctly sized to the visible 200px strip,
    // the full 45deg vertical FOV maps 1:1 onto it, so the text renders far smaller than
    // before. A narrow FOV here reproduces that same "zoomed in" look, deterministically.
    camera = new THREE.PerspectiveCamera(10, width / height, 0.1, 1000);
    camera.position.z = 100; // Pull back to see the big text

    // Set up Renderer with transparent background
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance

    // Lighting (Simple ambient + directional)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 10, 20);
    scene.add(dirLight);

    animate();
  }

  async function loadGeometry() {
    const response = await fetch(geometryUrl);
    const json = await response.json();
    if (destroyed) return;

    const geometryLoader = new THREE.BufferGeometryLoader();
    const geometry = geometryLoader.parse(json.main);
    const edgesGeometry = geometryLoader.parse(json.edges);

    create3DText(geometry, edgesGeometry);
  }

  function create3DText(geometry: THREE.BufferGeometry, edgesGeometry: THREE.BufferGeometry) {
    // THE CORE MESH (Solid Pink Face, Black Sides) - material groups (front/back
    // face vs. extruded sides) were baked into the geometry at generation time.
    const materials = [
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    ];
    textMesh = new THREE.Mesh(geometry, materials);

    // THE TRAVELING OUTLINE - edgesGeometry already carries the pre-computed
    // lineDistance attribute the shader needs.
    const lineMaterial = new THREE.ShaderMaterial({
      vertexShader: rainbowVertexShader,
      fragmentShader: rainbowFragmentShader,
      uniforms: shaderUniforms,
      transparent: true
    });

    const outline = new THREE.LineSegments(edgesGeometry, lineMaterial);

    textMesh.add(outline);

    // Static tilt so the text reads like it's angled up and away from the viewer,
    // as if shooting upward, instead of sitting flat-on.
    textMesh.rotation.x = -0.25;

    // Shift the whole mesh down within the fixed-height canvas: gives the tilted
    // top edge more headroom before it runs into the canvas's own clipping bounds,
    // while also tightening the gap between the text and the search bar below it.
    textMesh.position.y = -3;

    scene.add(textMesh);

    // Now that the text's bounds are known, shrink the canvas to fit it (also applies
    // the container-width-based scale).
    applyCanvasSize();
  }

  function animate(now: number = performance.now()) {
    animationId = requestAnimationFrame(animate);

    // Skip all the actual GPU/shader work while scrolled off-screen - keeping the
    // rAF loop itself alive is essentially free and lets it resume instantly.
    if (!isVisible) return;

    // 60fps cap (see FRAME_INTERVAL_MS). The 1ms tolerance keeps a 60Hz display from
    // skipping frames due to rAF timestamp jitter; carrying over the remainder keeps the
    // average close to 60fps on refresh rates that aren't a clean multiple of it (144Hz).
    const elapsed = now - lastRenderTime;
    if (elapsed < FRAME_INTERVAL_MS - 1) return;
    lastRenderTime = now - (elapsed % FRAME_INTERVAL_MS);

    // Update Shader Time for Rainbow Animation - time-based, so speed no longer
    // depends on refresh rate.
    startTime ??= now;
    shaderUniforms.uTime.value = ((now - startTime) / 1000) * RAINBOW_SPEED;

    renderer.render(scene, camera);
  }

  function onWindowResize() {
    applyCanvasSize();
  }
</script>

<div bind:this={container} class="three-container">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .three-container {
    width: 100%;
    height: 200px; /* Adjust height of the header area */
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    position: relative;
    cursor: default;
  }

  canvas {
    display: block;
    outline: none;
  }
</style>
