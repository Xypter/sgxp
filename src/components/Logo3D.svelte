<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
  import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
  import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
  import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

  let { text = "THE SGXP" } = $props();

  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  
  // Three.js global variables
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let textMesh: THREE.Mesh;
  let outlineMesh: THREE.LineSegments;
  let animationId: number;
  let mouse = { x: 0, y: 0 };
  let targetRotation = { x: 0, y: 0 };

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
    loadFont();
    window.addEventListener('resize', onWindowResize);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animationId);
      // Clean up Three.js resources
      renderer?.dispose();
    }
  });

  function initThree() {
    scene = new THREE.Scene();
    
    // Set up Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 100; // Pull back to see the big text

    // Set up Renderer with transparent background
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance

    // Lighting (Simple ambient + directional)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 10, 20);
    scene.add(dirLight);
    
    animate();
  }

  function loadFont() {
    const loader = new TTFLoader();
    const fontLoader = new FontLoader();

    // Make sure this path matches where you put the file in /public
    loader.load('/fonts/Starbirl.otf', (json) => {
      const font = fontLoader.parse(json);
      create3DText(font);
    });
  }

  function create3DText(font: any) {
    const geometry = new TextGeometry(text, {
      font: font,
      size: 8,
      depth: 15, // Deep extrusion as requested
      curveSegments: 4,
      bevelEnabled: false
    });

    geometry.computeBoundingBox();
    const xMid = - 0.5 * ( geometry.boundingBox!.max.x - geometry.boundingBox!.min.x );
    const yMid = - 0.5 * ( geometry.boundingBox!.max.y - geometry.boundingBox!.min.y );
    geometry.translate( xMid, yMid, 0 );

    // THE CORE MESH (Solid Pink Face, Black Sides)
    const materials = [
      new THREE.MeshBasicMaterial({ color: 0xffffff }), 
      new THREE.MeshBasicMaterial({ color: 0x000000 })  
    ];
    textMesh = new THREE.Mesh(geometry, materials);

    // THE TRAVELING OUTLINE
    // 1. Get the edges
    const edgesGeometry = new THREE.EdgesGeometry(geometry);

    // 2. Convert position array to Vector3 array for setFromPoints
    const positions = edgesGeometry.attributes.position;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < positions.count; i++) {
      points.push(new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      ));
    }
    const lineGeom = new THREE.BufferGeometry().setFromPoints(points); 
    // We use LineSegments but need to ensure distance attribute exists
    const pos = edgesGeometry.attributes.position;
    const lineDistances = new Float32Array(pos.count);
    let dist = 0;
    for (let i = 0; i < pos.count; i += 2) {
        const x1 = pos.getX(i), y1 = pos.getY(i), z1 = pos.getZ(i);
        const x2 = pos.getX(i+1), y2 = pos.getY(i+1), z2 = pos.getZ(i+1);
        const d = Math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2);
        lineDistances[i] = dist;
        lineDistances[i+1] = dist + d;
        dist += d; // Accumulate distance for a continuous flow
    }
    edgesGeometry.setAttribute('lineDistance', new THREE.BufferAttribute(lineDistances, 1));

    const lineMaterial = new THREE.ShaderMaterial({
      vertexShader: rainbowVertexShader,
      fragmentShader: rainbowFragmentShader,
      uniforms: shaderUniforms,
      transparent: true
    });

    const outline = new THREE.LineSegments(edgesGeometry, lineMaterial);
    
    // Slight offset to prevent z-fighting with the black extrusion
    outline.scale.set(1.0, 1.0, 1.0);

    textMesh.add(outline);
    scene.add(textMesh);
  }

  function handleMouseMove(e: MouseEvent) {
    // Normalize mouse position from -1 to 1
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    targetRotation.x = y * 0.5; // Max rotation X
    targetRotation.y = x * 0.5; // Max rotation Y
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    // Update Shader Time for Rainbow Animation
    shaderUniforms.uTime.value += 0.01;

    if (textMesh) {
      // Smoothly interpolate current rotation to target rotation (Lerp)
      textMesh.rotation.x += (targetRotation.x - textMesh.rotation.x) * 0.05;
      textMesh.rotation.y += (targetRotation.y - textMesh.rotation.y) * 0.05;
    }

    renderer.render(scene, camera);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
</script>

<svelte:window onmousemove={handleMouseMove} />

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