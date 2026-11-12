import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { useMemo, useState } from "react";
import * as THREE from "three";
import { WARD_GEO } from "@/lib/nexus/ward-geo";
import { RISK_HEX } from "@/lib/nexus/palette";
import type { RiskLevel } from "@/lib/nexus/risk";

const LAT0 = 19.07, LNG0 = 72.875;
const KX = 111.32 * Math.cos((LAT0 * Math.PI) / 180), KY = 110.57;
const proj = (lng: number, lat: number) => new THREE.Vector2((lng - LNG0) * KX, (lat - LAT0) * KY);

export interface Ward3D { code: string; height: number; level: RiskLevel; label: string }

function buildShapes(code: string) {
  const f = WARD_GEO.features.find((x) => (x.properties as { ward: string }).ward === code)!;
  const g = f.geometry as GeoJSON.MultiPolygon;
  return g.coordinates.map((poly) => {
    const shape = new THREE.Shape(poly[0].map(([x, y]) => proj(x, y)));
    poly.slice(1).forEach((hole) => shape.holes.push(new THREE.Path(hole.map(([x, y]) => proj(x, y)))));
    return shape;
  });
}

function WardBlock({ w, selected, onSelect, onHover }: { w: Ward3D; selected: boolean; onSelect: (c: string) => void; onHover: (c: string | null) => void }) {
  const [hover, setHover] = useState(false);
  const geom = useMemo(() => new THREE.ExtrudeGeometry(buildShapes(w.code), { depth: Math.max(0.15, w.height), bevelEnabled: false }), [w.code, w.height]);
  const color = RISK_HEX[w.level];
  return (
    <group>
      <mesh
        geometry={geom}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); onHover(w.code); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); onHover(null); document.body.style.cursor = ""; }}
        onClick={(e) => { e.stopPropagation(); onSelect(w.code); }}
      >
        <meshStandardMaterial color={color} roughness={0.75} metalness={0.05} emissive={selected || hover ? "#fff1d6" : "#000000"} emissiveIntensity={selected ? 0.1 : hover ? 0.07 : 0} />
      </mesh>
    </group>
  );
}

export default function Mumbai3D({ wards, selected, onSelect }: { wards: Ward3D[]; selected: string | null; onSelect: (c: string) => void }) {
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const hw = wards.find((w) => w.code === hovered);
  return (
    <div className="relative h-full w-full" data-scene-ready={ready ? "" : undefined}>
      {hw && <div className="pointer-events-none absolute left-3 top-3 z-10 rounded border border-border bg-card px-2.5 py-1.5 text-xs shadow">{hw.label}</div>}
      <Canvas shadows="basic" camera={{ position: [8, 42, 52], fov: 40, near: 0.5, far: 400 }} onCreated={() => requestAnimationFrame(() => setReady(true))} dpr={[1, 2]}>
        <color attach="background" args={["#e7eeea"]} />
        <fog attach="fog" args={["#e7eeea", 70, 160]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[20, 40, 15]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} />
        <Environment resolution={64}>
          <Lightformer intensity={1.5} position={[0, 10, 0]} scale={[20, 20, 1]} rotation-x={Math.PI / 2} />
          <Lightformer intensity={0.6} color="#cfe3d8" position={[-10, 2, -5]} rotation-y={Math.PI / 2} scale={[30, 2, 1]} />
        </Environment>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
          <planeGeometry args={[220, 220]} />
          <meshStandardMaterial color="#9fc1cf" roughness={0.35} metalness={0.1} />
        </mesh>
        <group onPointerMissed={() => undefined}>
          {wards.map((w) => <WardBlock key={w.code} w={w} selected={selected === w.code} onSelect={onSelect} onHover={setHovered} />)}
        </group>
        <OrbitControls makeDefault target={[0, 0, -2]} maxPolarAngle={Math.PI / 2.15} minDistance={12} maxDistance={110} enableDamping />
      </Canvas>
    </div>
  );
}
