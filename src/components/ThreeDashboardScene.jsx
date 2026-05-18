import { useEffect, useMemo, useRef } from "react";

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

function lineClamp(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function makeCodeCardTexture(THREE, artifact, selected) {
  const canvas = document.createElement("canvas");
  canvas.width = 760;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);

  gradient.addColorStop(0, selected ? "rgba(34, 211, 238, 0.28)" : "rgba(148, 163, 184, 0.18)");
  gradient.addColorStop(1, selected ? "rgba(245, 158, 11, 0.16)" : "rgba(15, 23, 42, 0.74)");

  ctx.fillStyle = "rgba(5, 11, 22, 0.86)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = selected ? "rgba(125, 249, 255, 0.92)" : "rgba(173, 216, 230, 0.34)";
  ctx.lineWidth = selected ? 5 : 2;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

  ctx.fillStyle = selected ? "#c8fbff" : "#e8f1ff";
  ctx.font = "700 34px Inter, Segoe UI, sans-serif";
  ctx.fillText(lineClamp(artifact.title, 31), 42, 70);

  ctx.fillStyle = selected ? "#f6c66c" : "#8bd7ff";
  ctx.font = "600 22px Inter, Segoe UI, sans-serif";
  ctx.fillText(`${artifact.language} / ${artifact.collection}`, 42, 112);

  const lines = artifact.code.split("\n").slice(0, 8);
  ctx.font = "22px Consolas, Menlo, monospace";
  lines.forEach((line, index) => {
    ctx.fillStyle = index % 2 ? "rgba(210, 229, 255, 0.74)" : "rgba(168, 245, 255, 0.88)";
    ctx.fillText(lineClamp(line, 58), 42, 166 + index * 28);
  });

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "600 19px Inter, Segoe UI, sans-serif";
  ctx.fillText(artifact.tags.slice(0, 3).map((tag) => `#${tag}`).join("  "), 42, 386);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildParticleField(THREE) {
  const count = 170;
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 24;
    positions[index * 3 + 1] = (Math.random() - 0.5) * 12;
    positions[index * 3 + 2] = (Math.random() - 0.5) * 18;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x8bd7ff,
    size: 0.035,
    transparent: true,
    opacity: 0.58,
  });

  return new THREE.Points(geometry, material);
}

export function ThreeDashboardScene({ artifacts, selectedId, onSelect }) {
  const mountRef = useRef(null);
  const selectedLabel = useMemo(
    () => artifacts.find((artifact) => artifact.id === selectedId)?.title ?? "No script selected",
    [artifacts, selectedId],
  );

  useEffect(() => {
    if (!mountRef.current || !supportsWebGL()) return undefined;

    const mount = mountRef.current;
    let disposed = false;
    let cleanupScene = () => {};

    async function mountScene() {
      const THREE = await import("three");
      if (disposed) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x050b16, 12, 28);

      const camera = new THREE.PerspectiveCamera(
        42,
        mount.clientWidth / Math.max(mount.clientHeight, 1),
        0.1,
        100,
      );
      camera.position.set(0, 1.35, 10.6);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.domElement.setAttribute("aria-label", "3D flying saved-code scripts scene");
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xd7f7ff, 0.9));

      const keyLight = new THREE.PointLight(0x7df9ff, 18, 28);
      keyLight.position.set(-3, 4, 5);
      scene.add(keyLight);

      const warmLight = new THREE.PointLight(0xf2b35d, 8, 20);
      warmLight.position.set(5, -1, 3);
      scene.add(warmLight);

      const core = new THREE.Group();
      const coreMaterial = new THREE.MeshStandardMaterial({
        color: 0x0f2634,
        emissive: 0x0a4d5c,
        emissiveIntensity: 0.65,
        metalness: 0.28,
        roughness: 0.38,
        transparent: true,
        opacity: 0.78,
      });
      const coreRing = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.018, 16, 96), coreMaterial);
      const coreRingTwo = new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.012, 16, 112), coreMaterial);
      coreRingTwo.rotation.x = Math.PI / 2.7;
      core.add(coreRing, coreRingTwo);
      scene.add(core);

      const particles = buildParticleField(THREE);
      scene.add(particles);

      const group = new THREE.Group();
      const interactiveMeshes = [];
      const visibleArtifacts = artifacts.slice(0, 10);

      visibleArtifacts.forEach((artifact, index) => {
        const selected = artifact.id === selectedId;
        const texture = makeCodeCardTexture(THREE, artifact, selected);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: selected ? 0.96 : 0.74,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.44), material);
        const angle = (index / Math.max(visibleArtifacts.length, 1)) * Math.PI * 2;
        const radius = selected ? 3.25 : 4.55 + (index % 3) * 0.42;
        mesh.position.set(
          Math.cos(angle) * radius,
          (index % 2 === 0 ? 0.75 : -0.65) + Math.sin(angle * 1.8) * 0.22,
          Math.sin(angle) * 2.25,
        );
        mesh.rotation.y = -angle * 0.35;
        mesh.userData = {
          id: artifact.id,
          angle,
          radius,
          y: mesh.position.y,
          selected,
        };
        group.add(mesh);
        interactiveMeshes.push(mesh);
      });

      scene.add(group);

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();

      function updatePointer(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      }

      function onPointerMove(event) {
        updatePointer(event);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(interactiveMeshes)[0];
        renderer.domElement.style.cursor = hit ? "pointer" : "default";
      }

      function onPointerDown(event) {
        updatePointer(event);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(interactiveMeshes)[0];
        if (hit?.object?.userData?.id) {
          onSelect(hit.object.userData.id);
        }
      }

      function onResize() {
        const width = mount.clientWidth;
        const height = mount.clientHeight;
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }

      const resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(mount);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerdown", onPointerDown);

      let frameId = 0;
      const clock = new THREE.Clock();

      function animate() {
        const elapsed = clock.getElapsedTime();
        const speed = reducedMotion ? 0 : 0.15;

        core.rotation.z = elapsed * 0.18;
        core.rotation.x = Math.sin(elapsed * 0.25) * 0.1;
        particles.rotation.y = elapsed * 0.025;

        interactiveMeshes.forEach((mesh, index) => {
          const { angle, radius, y, selected } = mesh.userData;
          const drift = angle + elapsed * speed + index * 0.015;
          mesh.position.x = Math.cos(drift) * radius;
          mesh.position.z = Math.sin(drift) * 2.25;
          mesh.position.y = y + Math.sin(elapsed * 0.8 + index) * (reducedMotion ? 0 : 0.11);
          mesh.scale.setScalar(selected ? 1.15 : 1);
          mesh.lookAt(camera.position);
        });

        camera.position.x = Math.sin(elapsed * 0.12) * (reducedMotion ? 0 : 0.28);
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(animate);
      }

      animate();

      cleanupScene = () => {
        window.cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.dispose();
        scene.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => {
              if (material.map) material.map.dispose();
              material.dispose();
            });
          }
        });
        mount.replaceChildren();
      };
    }

    mountScene();

    return () => {
      disposed = true;
      cleanupScene();
    };
  }, [artifacts, onSelect, selectedId]);

  if (typeof window !== "undefined" && !supportsWebGL()) {
    return (
      <div className="three-fallback" data-testid="three-dashboard">
        <strong>3D scene unavailable</strong>
        <p>Your saved scripts are still available through the library and inspector.</p>
      </div>
    );
  }

  return (
    <section
      className="three-stage"
      id="dashboard"
      aria-label="Three dimensional flying saved-code dashboard"
      data-testid="three-dashboard"
    >
      <h2 className="sr-only">Flying saved-code scripts</h2>
      <span className="scene-selected-label">{selectedLabel}</span>
      <div className="three-canvas-shell" ref={mountRef} />
      <div className="scene-controls" aria-hidden="true">
        <span>Drag to orbit</span>
        <span>Scroll to zoom</span>
        <span>Shift + Drag to pan</span>
        <span>R Reset view</span>
      </div>
    </section>
  );
}
