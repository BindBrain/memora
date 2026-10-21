"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function KnowledgeTreeBackground() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      Math.max(host.clientWidth, 1) / Math.max(host.clientHeight, 1),
      0.1,
      100
    );
    camera.position.set(0, 0, 10);

    const root = new THREE.Group();
    scene.add(root);

    const tree = new THREE.Group();
    root.add(tree);

    const palette = [
      0xc5b8f3,
      0xaedfd8,
      0xf0c5dc,
      0xf1d9a9,
      0xbacbf5,
    ];

    const endpoints: THREE.Vector3[] = [];
    const branchPositions: number[] = [];

    function grow(
      start: THREE.Vector3,
      angle: number,
      length: number,
      depth: number
    ) {
      const end = new THREE.Vector3(
        start.x + Math.sin(angle) * length,
        start.y + Math.cos(angle) * length,
        start.z + (Math.random() - 0.5) * 0.16
      );

      branchPositions.push(
        start.x, start.y, start.z,
        end.x, end.y, end.z
      );

      if (depth <= 0) {
        endpoints.push(end);
        return;
      }

      grow(end, angle - 0.43 - Math.random() * 0.12, length * 0.76, depth - 1);
      grow(end, angle + 0.43 + Math.random() * 0.12, length * 0.76, depth - 1);

      if (depth > 2) {
        grow(end, angle + (Math.random() - 0.5) * 0.18, length * 0.7, depth - 1);
      }
    }

    grow(new THREE.Vector3(0, -3.0, 0), 0, 1.12, 5);

    const branchGeometry = new THREE.BufferGeometry();
    branchGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(branchPositions, 3)
    );

    const branchMaterial = new THREE.LineBasicMaterial({
      color: 0xc5b8ec,
      transparent: true,
      opacity: 0.48,
    });

    tree.add(new THREE.LineSegments(branchGeometry, branchMaterial));

    const nodeGeometry = new THREE.SphereGeometry(0.055, 12, 12);
    const nodes: Array<{
      mesh: THREE.Mesh;
      base: THREE.Vector3;
      phase: number;
      radius: number;
    }> = [];

    endpoints.forEach((point, index) => {
      const material = new THREE.MeshBasicMaterial({
        color: palette[index % palette.length],
        transparent: true,
        opacity: 0.92,
      });

      const node = new THREE.Mesh(nodeGeometry, material);
      const scale = 0.65 + Math.random() * 1.2;
      node.scale.setScalar(scale);
      node.position.copy(point);
      tree.add(node);

      nodes.push({
        mesh: node,
        base: point.clone(),
        phase: Math.random() * Math.PI * 2,
        radius: 0.035 + Math.random() * 0.055,
      });
    });

    const extraNodes: Array<{
      mesh: THREE.Mesh;
      base: THREE.Vector3;
      phase: number;
    }> = [];

    for (let i = 0; i < 28; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: palette[i % palette.length],
        transparent: true,
        opacity: 0.55,
      });

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.025 + Math.random() * 0.025, 8, 8),
        material
      );

      const base = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 1.5
      );

      mesh.position.copy(base);
      scene.add(mesh);
      extraNodes.push({ mesh, base, phase: Math.random() * Math.PI * 2 });
    }

    // Place the tree to the right so it remains an ambient background.
    root.position.set(2.1, 0.1, 0);
    root.scale.setScalar(1.05);

    let width = host.clientWidth;
    let height = host.clientHeight;
    let frame = 0;
    let elapsed = 0;
    let previousTime = 0;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;
    let visible = true;

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      targetX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 0.28;
      targetY = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 0.18;
    };

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      previousTime = 0;
    };

    const observer = new ResizeObserver(() => {
      width = host.clientWidth;
      height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });

    observer.observe(host);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);

      if (!visible || !width || !height) return;

      const delta = previousTime ? Math.min((now - previousTime) / 1000, 0.05) : 0;
      previousTime = now;

      if (!reducedMotion.matches) elapsed += delta;

      const t = elapsed;

      // Continuous gentle swaying and subtle 3D rotation.
      root.rotation.y = Math.sin(t * 0.22) * 0.12 + pointerX * 0.3;
      root.rotation.x = Math.sin(t * 0.17) * 0.045 + pointerY * 0.2;
      root.rotation.z = Math.sin(t * 0.12) * 0.025;
      root.position.x = 2.1 + Math.sin(t * 0.19) * 0.16;
      root.position.y = 0.1 + Math.cos(t * 0.24) * 0.13;

      tree.rotation.y = Math.sin(t * 0.3) * 0.035;
      tree.rotation.x = Math.cos(t * 0.25) * 0.025;

      nodes.forEach(({ mesh, base, phase, radius }) => {
        mesh.position.x = base.x + Math.sin(t * 0.65 + phase) * radius;
        mesh.position.y = base.y + Math.cos(t * 0.55 + phase) * radius * 1.5;
      });

      extraNodes.forEach(({ mesh, base, phase }) => {
        mesh.position.x = base.x + Math.sin(t * 0.22 + phase) * 0.18;
        mesh.position.y = base.y + Math.cos(t * 0.3 + phase) * 0.22;
      });

      pointerX += (targetX - pointerX) * 0.025;
      pointerY += (targetY - pointerY) * 0.025;

      renderer.render(scene, camera);
    };

    if (reducedMotion.matches) {
      renderer.render(scene, camera);
    } else {
      frame = requestAnimationFrame(animate);
    }

    const onMotionChange = () => {
      cancelAnimationFrame(frame);
      previousTime = 0;
      if (reducedMotion.matches) {
        renderer.render(scene, camera);
      } else {
        frame = requestAnimationFrame(animate);
      }
    };

    reducedMotion.addEventListener("change", onMotionChange);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener("change", onMotionChange);
      branchGeometry.dispose();
      branchMaterial.dispose();
      nodeGeometry.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    />
  );
}
