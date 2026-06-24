import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js";

const stage = document.querySelector("#home-3d-stage");
const games = Array.isArray(window.TINY_ARCADE_GAMES)
  ? window.TINY_ARCADE_GAMES
  : [{
      id: "mochi-sky",
      preview: "./assets/previews/mochi-sky.png",
      featured: true
    }];

if (stage && supportsWebGL()) {
  initHomeStage(stage, games);
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function initHomeStage(container, catalog) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  const clock = new THREE.Clock();
  const loader = new THREE.TextureLoader();
  const pointer = { x: 0, y: 0 };
  const pointerTarget = { x: 0, y: 0 };
  const floaters = [];

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.className = "home-3d-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.append(renderer.domElement);

  const root = new THREE.Group();
  root.name = "TinyArcadeHomeStage";
  root.position.y = -0.18;
  scene.add(root);

  scene.add(new THREE.HemisphereLight(0xd7f8ff, 0x101324, 1.25));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
  keyLight.position.set(3.5, 4.8, 4.2);
  scene.add(keyLight);
  const magentaLight = new THREE.PointLight(0xff78c9, 2.8, 8);
  magentaLight.position.set(-3.2, 1.4, 3.4);
  scene.add(magentaLight);
  const cyanLight = new THREE.PointLight(0x65e6ff, 2.4, 8);
  cyanLight.position.set(3.4, 2.1, 2.8);
  scene.add(cyanLight);

  const featured = catalog.find((game) => game.featured) || catalog[0];
  const materials = createMaterials();
  const cabinet = createCabinet(featured, materials, loader, renderStill);
  cabinet.position.set(0, 0, 0.05);
  cabinet.rotation.y = -0.22;
  root.add(cabinet);

  addWorldGrid(root);
  addNeonFrame(root);
  addPixelField(root);

  const displayGames = catalog.length > 1
    ? catalog.filter((game) => game.id !== featured?.id)
    : catalog;
  const cardSlots = [
    { position: [-2.15, 1.2, -0.45], rotation: [0.04, 0.54, -0.12] },
    { position: [2.12, 0.85, -0.35], rotation: [-0.03, -0.48, 0.11] },
    { position: [-1.72, -0.32, 0.18], rotation: [-0.1, 0.46, 0.08] },
    { position: [1.74, -0.2, 0.08], rotation: [0.08, -0.42, -0.06] }
  ];

  displayGames.slice(0, cardSlots.length).forEach((game, index) => {
    const card = createPreviewCard(game, index, materials, loader, renderStill);
    const slot = cardSlots[index];
    card.position.set(...slot.position);
    card.rotation.set(...slot.rotation);
    card.userData.baseY = slot.position[1];
    card.userData.floatSpeed = 0.74 + index * 0.16;
    floaters.push(card);
    root.add(card);
  });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  bindPointer(container, pointer, pointerTarget, reducedMotion, () => renderFrame(0));

  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    document.body.classList.remove("home-3d-ready");
  });

  document.addEventListener("visibilitychange", syncAnimation);
  reducedMotion.addEventListener("change", syncAnimation);
  document.body.classList.add("home-3d-ready");
  syncAnimation();

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.set(width < 520 ? 0.2 : 0.36, width < 520 ? 1.05 : 1.24, width < 520 ? 7.25 : 6.2);
    camera.lookAt(0, 0.05, 0);
    root.scale.setScalar(width < 520 ? 0.82 : 1);
    root.position.y = width < 520 ? -0.26 : -0.18;
    camera.updateProjectionMatrix();
    renderStill();
  }

  function syncAnimation() {
    if (document.hidden || reducedMotion.matches) {
      renderer.setAnimationLoop(null);
      renderStill();
      return;
    }
    renderer.setAnimationLoop(animate);
  }

  function animate() {
    renderFrame(clock.getElapsedTime());
  }

  function renderStill() {
    renderFrame(reducedMotion.matches ? 0 : clock.getElapsedTime());
  }

  function renderFrame(time) {
    pointer.x += (pointerTarget.x - pointer.x) * (reducedMotion.matches ? 1 : 0.06);
    pointer.y += (pointerTarget.y - pointer.y) * (reducedMotion.matches ? 1 : 0.06);

    root.rotation.y = pointer.x * 0.14 + Math.sin(time * 0.28) * 0.035;
    root.rotation.x = -pointer.y * 0.045;
    cabinet.rotation.y = -0.22 + Math.sin(time * 0.62) * 0.035;
    cabinet.position.y = Math.sin(time * 0.72) * 0.035;

    floaters.forEach((card, index) => {
      card.position.y = card.userData.baseY + Math.sin(time * card.userData.floatSpeed + index) * 0.09;
      card.rotation.z += Math.sin(time * 0.55 + index) * 0.0008;
    });

    renderer.render(scene, camera);
  }
}

function createMaterials() {
  return {
    cabinet: new THREE.MeshStandardMaterial({
      color: "#293a7b",
      roughness: 0.48,
      metalness: 0.18,
      emissive: "#071222",
      emissiveIntensity: 0.32
    }),
    cabinetDark: new THREE.MeshStandardMaterial({
      color: "#11182a",
      roughness: 0.52,
      metalness: 0.12
    }),
    trim: new THREE.MeshStandardMaterial({
      color: "#65e6ff",
      roughness: 0.35,
      metalness: 0.25,
      emissive: "#1abdd8",
      emissiveIntensity: 0.45
    }),
    violet: new THREE.MeshStandardMaterial({
      color: "#9c82ff",
      roughness: 0.38,
      metalness: 0.2,
      emissive: "#34256f",
      emissiveIntensity: 0.42
    }),
    yellow: new THREE.MeshStandardMaterial({
      color: "#ffd76b",
      roughness: 0.4,
      metalness: 0.14,
      emissive: "#5d3f09",
      emissiveIntensity: 0.35
    }),
    pink: new THREE.MeshStandardMaterial({
      color: "#ff78c9",
      roughness: 0.42,
      metalness: 0.12,
      emissive: "#5b123f",
      emissiveIntensity: 0.38
    }),
    panel: new THREE.MeshStandardMaterial({
      color: "#18243d",
      roughness: 0.58,
      metalness: 0.18,
      emissive: "#071222",
      emissiveIntensity: 0.24
    })
  };
}

function createCabinet(game, materials, loader, requestRender) {
  const group = new THREE.Group();
  group.name = "FeaturedArcadeCabinet";

  addBox(group, "cabinetFoot", [2.08, 0.26, 1.08], [0, -1.06, 0], materials.cabinetDark);
  addBox(group, "cabinetBase", [1.84, 1.18, 0.96], [0, -0.42, 0], materials.cabinet);
  addBox(group, "cabinetMarquee", [1.72, 0.38, 0.74], [0, 0.74, 0.02], materials.violet);
  addBox(group, "screenFrame", [1.5, 0.9, 0.12], [0, 0.12, 0.51], materials.cabinetDark);
  addBox(group, "controlPanel", [1.56, 0.18, 0.64], [0, -0.61, 0.48], materials.panel, [-0.16, 0, 0]);
  addBox(group, "cyanTrim", [1.98, 0.08, 1.02], [0, -0.86, 0.04], materials.trim);

  const screenMaterial = createTextureMaterial(game?.preview, "#17233d", loader, requestRender);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.69), screenMaterial);
  screen.name = "featuredPreviewScreen";
  screen.position.set(0, 0.12, 0.58);
  group.add(screen);

  const buttonGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.04, 14);
  [
    [-0.34, -0.49, 0.82, materials.pink],
    [-0.15, -0.48, 0.84, materials.yellow],
    [0.04, -0.49, 0.83, materials.trim]
  ].forEach(([x, y, z, material]) => {
    const button = new THREE.Mesh(buttonGeometry, material);
    button.rotation.x = Math.PI / 2;
    button.position.set(x, y, z);
    group.add(button);
  });

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.28, 10), materials.cabinetDark);
  stem.rotation.x = Math.PI / 2.2;
  stem.position.set(0.42, -0.46, 0.8);
  group.add(stem);

  const knob = new THREE.Mesh(new THREE.OctahedronGeometry(0.105, 1), materials.pink);
  knob.position.set(0.45, -0.37, 0.9);
  group.add(knob);

  return group;
}

function createPreviewCard(game, index, materials, loader, requestRender) {
  const group = new THREE.Group();
  group.name = `PreviewPanel_${game.id || index}`;

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.86, 0.06), index % 2 ? materials.violet : materials.trim);
  frame.name = "previewFrame";
  group.add(frame);

  const plate = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.72, 0.04), materials.cabinetDark);
  plate.name = "previewPlate";
  plate.position.z = 0.045;
  group.add(plate);

  const preview = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 0.64),
    createTextureMaterial(game.preview, "#1b2742", loader, requestRender)
  );
  preview.name = "previewTexture";
  preview.position.z = 0.072;
  group.add(preview);

  return group;
}

function addWorldGrid(root) {
  const grid = new THREE.GridHelper(8.5, 18, 0x65e6ff, 0x243654);
  grid.name = "stageGrid";
  grid.position.set(0, -1.18, -0.18);
  grid.material.transparent = true;
  grid.material.opacity = 0.32;
  root.add(grid);
}

function addNeonFrame(root) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-2.8, -0.95, -0.48),
    new THREE.Vector3(-1.5, 1.82, -0.86),
    new THREE.Vector3(1.55, 1.74, -0.86),
    new THREE.Vector3(2.75, -0.95, -0.48),
    new THREE.Vector3(-2.8, -0.95, -0.48)
  ]);
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0xffd76b,
      transparent: true,
      opacity: 0.62
    })
  );
  line.name = "neonBackFrame";
  root.add(line);
}

function addPixelField(root) {
  const count = 95;
  const positions = new Float32Array(count * 3);
  let seed = 18;

  for (let index = 0; index < count; index += 1) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const a = seed / 4294967296;
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const b = seed / 4294967296;
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const c = seed / 4294967296;
    positions[index * 3] = (a - 0.5) * 6.4;
    positions[index * 3 + 1] = b * 3.4 - 0.3;
    positions[index * 3 + 2] = -1.2 - c * 2.2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xaab4cb,
      size: 0.026,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true
    })
  );
  points.name = "pixelField";
  root.add(points);
}

function addBox(parent, name, size, position, material, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function createTextureMaterial(src, fallbackColor, loader, requestRender) {
  const material = new THREE.MeshBasicMaterial({
    color: fallbackColor,
    side: THREE.DoubleSide
  });

  if (!src) return material;

  const texture = loader.load(
    src,
    () => {
      material.color.set("#ffffff");
      material.needsUpdate = true;
      requestRender();
    },
    undefined,
    () => {
      material.color.set(fallbackColor);
      material.needsUpdate = true;
      requestRender();
    }
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  material.map = texture;
  return material;
}

function bindPointer(container, pointer, target, reducedMotion, requestRender) {
  container.addEventListener("pointermove", (event) => {
    const rect = container.getBoundingClientRect();
    target.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    target.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    if (reducedMotion.matches) {
      pointer.x = target.x;
      pointer.y = target.y;
      requestRender();
    }
  });

  container.addEventListener("pointerleave", () => {
    target.x = 0;
    target.y = 0;
    if (reducedMotion.matches) {
      pointer.x = 0;
      pointer.y = 0;
      requestRender();
    }
  });
}
