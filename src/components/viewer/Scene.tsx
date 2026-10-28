"use client";
import { CameraControls, ContactShadows, Environment, Html, Lightformer, Line } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { getCategory, type Part } from "@/lib/catalog";
import { boundingBox } from "@/lib/catalog/parts";
import type { Design } from "@/lib/design/design";
import { CM, createPartGeometry, geometryKey } from "@/lib/three/geometry";
import { getWoodMaps } from "@/lib/three/woodTextures";
import { VIEWER_BG, type ViewerHandle, type ViewName } from "./types";

interface SceneProps {
  design: Design;
  showDimensions: boolean;
  handleRef?: RefObject<ViewerHandle | null>;
  onContextLost?: () => void;
  onReady?: () => void;
}

const FOV = 35;
const VIEWS: Record<ViewName, { azimuth: number; polar: number }> = {
  perspectiva: { azimuth: 0.62, polar: 1.12 },
  frente: { azimuth: 0, polar: 1.42 },
  lateral: { azimuth: Math.PI / 2, polar: 1.42 },
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function fitDistance(radius: number, aspect: number) {
  const vFov = (FOV * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  return (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.1;
}

function viewPosition(center: THREE.Vector3, distance: number, azimuth: number, polar: number) {
  return new THREE.Vector3(
    center.x + distance * Math.sin(polar) * Math.sin(azimuth),
    center.y + distance * Math.cos(polar),
    center.z + distance * Math.sin(polar) * Math.cos(azimuth),
  );
}

function useMaterials(woodId: string, anisotropy: number) {
  const materials = useMemo(() => {
    const maps = getWoodMaps(woodId, anisotropy);
    return {
      wood: new THREE.MeshStandardMaterial({ map: maps.map, bumpMap: maps.bumpMap, bumpScale: 0.35, roughness: maps.roughness, metalness: 0 }),
      glass: new THREE.MeshStandardMaterial({ color: "#dfeaea", transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, depthWrite: false }),
      reference: new THREE.MeshStandardMaterial({ color: "#efebe4", roughness: 0.95, transparent: true, opacity: 0.92 }),
      shadow: new THREE.MeshBasicMaterial({ color: "#2b2019" }),
    };
  }, [woodId, anisotropy]);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);
  return materials;
}

function PartMesh({ part, material }: { part: Part; material: THREE.Material }) {
  const ref = useRef<THREE.Mesh>(null);
  const key = geometryKey(part);
  const geometry = useMemo(() => createPartGeometry(part), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry]);
  const target = useMemo(() => new THREE.Vector3(part.position[0] * CM, part.position[1] * CM, part.position[2] * CM), [part.position]);
  const invalidate = useThree((s) => s.invalidate);
  const reduced = useMemo(prefersReducedMotion, []);

  useLayoutEffect(() => {
    // Primera ubicación sin animación.
    if (ref.current && ref.current.userData.placed !== true) {
      ref.current.position.copy(target);
      ref.current.userData.placed = true;
    }
  }, [target]);

  useEffect(() => {
    invalidate();
  }, [target, geometry, invalidate]);

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    if (reduced) {
      m.position.copy(target);
      return;
    }
    const dist = m.position.distanceTo(target);
    if (dist > 0.0005) {
      m.position.lerp(target, 1 - Math.exp(-delta * 14));
      invalidate();
    } else if (dist > 0) {
      m.position.copy(target);
    }
  });

  const isOpaque = part.material !== "glass" && part.material !== "shadow";
  return (
    <mesh
      ref={ref}
      geometry={geometry}
      material={material}
      rotation={part.rotation ?? [0, 0, 0]}
      castShadow={isOpaque && part.material !== "reference"}
      receiveShadow={isOpaque}
    />
  );
}

function Dimensions({ box }: { box: THREE.Box3 }) {
  const off = 0.07;
  const { min, max } = box;
  const color = "#6b5a4c";
  const label = (v: number) => `${Math.round(v / CM)} cm`;
  const w = max.x - min.x;
  const h = max.y - min.y;
  const d = max.z - min.z;
  const tick = 0.025;
  return (
    <group name="dimensiones">
      <Line points={[[min.x, min.y + 0.002, max.z + off], [max.x, min.y + 0.002, max.z + off]]} color={color} lineWidth={1.2} />
      <Line points={[[min.x, min.y, max.z + off - tick], [min.x, min.y, max.z + off + tick]]} color={color} lineWidth={1.2} />
      <Line points={[[max.x, min.y, max.z + off - tick], [max.x, min.y, max.z + off + tick]]} color={color} lineWidth={1.2} />
      <Html position={[(min.x + max.x) / 2, min.y, max.z + off]} center zIndexRange={[5, 0]} className="dim-label">
        {label(w)}
      </Html>
      <Line points={[[max.x + off, min.y, max.z], [max.x + off, max.y, max.z]]} color={color} lineWidth={1.2} />
      <Html position={[max.x + off, (min.y + max.y) / 2, max.z]} center zIndexRange={[5, 0]} className="dim-label">
        {label(h)}
      </Html>
      <Line points={[[max.x + off, min.y + 0.002, min.z], [max.x + off, min.y + 0.002, max.z]]} color={color} lineWidth={1.2} />
      <Html position={[max.x + off, min.y, (min.z + max.z) / 2]} center zIndexRange={[5, 0]} className="dim-label">
        {label(d)}
      </Html>
    </group>
  );
}

function SceneContent({ design, showDimensions, handleRef, onReady }: SceneProps) {
  const { gl, scene, camera, size, invalidate } = useThree();
  const controls = useRef<CameraControls>(null);
  const cat = getCategory(design.category)!;
  const parts = useMemo(() => cat.build(design), [cat, design]);
  const materials = useMaterials(design.wood, Math.min(8, gl.capabilities.getMaxAnisotropy()));
  const dimsRef = useRef<THREE.Group>(null);

  const bbox = useMemo(() => {
    const bb = boundingBox(parts);
    return new THREE.Box3(new THREE.Vector3(...bb.min).multiplyScalar(CM), new THREE.Vector3(...bb.max).multiplyScalar(CM));
  }, [parts]);
  const sphere = useMemo(() => bbox.getBoundingSphere(new THREE.Sphere()), [bbox]);
  const reduced = useMemo(prefersReducedMotion, []);

  const frame = (azimuth: number, polar: number, transition: boolean) => {
    const c = controls.current;
    if (!c) return;
    const dist = fitDistance(sphere.radius, size.width / Math.max(1, size.height));
    const pos = viewPosition(sphere.center, dist, azimuth, polar);
    c.minDistance = sphere.radius * 0.6;
    c.maxDistance = dist * 3;
    void c.setLookAt(pos.x, pos.y, pos.z, sphere.center.x, sphere.center.y, sphere.center.z, transition && !reduced);
  };

  // Encuadre inicial y al cambiar de mueble o estilo.
  const layoutKey = `${design.category}:${design.templateId}`;
  const framedKey = useRef<string | null>(null);
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    if (framedKey.current !== layoutKey) {
      const first = framedKey.current === null;
      framedKey.current = layoutKey;
      frame(VIEWS.perspectiva.azimuth, VIEWS.perspectiva.polar, !first);
      if (first) onReady?.();
    } else {
      // Al cambiar medidas se reencuadra manteniendo el ángulo actual.
      frame(c.azimuthAngle, c.polarAngle, true);
    }
    invalidate();
  }, [sphere.radius, sphere.center.x, sphere.center.y, sphere.center.z, layoutKey, size.width, size.height]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      setView: (view) => frame(VIEWS[view].azimuth, VIEWS[view].polar, true),
      capture: (view, width = 1200, height = 900) => {
        try {
          const cam = new THREE.PerspectiveCamera(FOV, width / height, 0.05, 60);
          const v = VIEWS[view];
          cam.position.copy(viewPosition(sphere.center, fitDistance(sphere.radius, width / height) * 1.04, v.azimuth, v.polar));
          cam.lookAt(sphere.center);
          const prevSize = gl.getSize(new THREE.Vector2());
          const prevRatio = gl.getPixelRatio();
          const dims = dimsRef.current;
          if (dims) dims.visible = false;
          gl.setPixelRatio(1);
          gl.setSize(width, height, false);
          gl.render(scene, cam);
          const url = gl.domElement.toDataURL("image/jpeg", 0.88);
          gl.setPixelRatio(prevRatio);
          gl.setSize(prevSize.x, prevSize.y, false);
          if (dims) dims.visible = true;
          gl.render(scene, camera);
          invalidate();
          return url;
        } catch {
          return null;
        }
      },
    };
  });

  const shadowExtent = Math.max(1, sphere.radius * 1.6);
  return (
    <>
      <hemisphereLight args={["#fff8ee", "#d8cdbf", 0.55]} />
      <directionalLight
        position={[sphere.center.x + 2.2, 4.2, sphere.center.z + 3]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.015}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
      />
      <Environment resolution={128} frames={1} environmentIntensity={0.55}>
        <Lightformer intensity={2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} />
        <Lightformer intensity={1.2} position={[-5, 2, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} color="#fff2e0" />
        <Lightformer intensity={0.8} position={[5, 2, -2]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer intensity={0.6} position={[0, 2, 6]} scale={[8, 3, 1]} color="#fffaf2" />
      </Environment>

      <group>
        {parts.map((p) => (
          <PartMesh key={p.id} part={p} material={materials[p.material]} />
        ))}
      </group>

      <mesh rotation-x={-Math.PI / 2} position={[sphere.center.x, 0, sphere.center.z]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial opacity={0.12} />
      </mesh>
      <ContactShadows
        position={[sphere.center.x, 0.0005, sphere.center.z]}
        scale={Math.max(2, sphere.radius * 4)}
        opacity={0.5}
        blur={2.2}
        far={1.2}
        resolution={512}
        color="#3b2a1d"
      />

      <group ref={dimsRef}>{showDimensions && <Dimensions box={bbox} />}</group>

      <CameraControls
        ref={controls}
        makeDefault
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI / 2 - 0.03}
        smoothTime={0.28}
        draggingSmoothTime={0.08}
        dollyToCursor
      />
    </>
  );
}

export default function Scene(props: SceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop="demand"
      camera={{ fov: FOV, near: 0.05, far: 60, position: [3, 2, 4] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          props.onContextLost?.();
        });
      }}
      aria-label="Vista 3D del mueble"
    >
      <color attach="background" args={[VIEWER_BG]} />
      <SceneContent {...props} />
    </Canvas>
  );
}
