import { ThreeCanvas } from "@remotion/three";
import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import { AbsoluteFill, staticFile } from "remotion";
import {
  BufferGeometry,
  Color,
  DoubleSide,
  EquirectangularReflectionMapping,
  Float32BufferAttribute,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
} from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

const assetRoot = "campaign-003/hero-frame/assets";
const materialRoot = `${assetRoot}/Metal049A_1K-JPG`;

type DuctMaterialMaps = {
  color: Texture;
  metalness: Texture;
  normal: Texture;
  roughness: Texture;
};

function useDuctMaterialMaps(): DuctMaterialMaps {
  const maps = useLoader(TextureLoader, [
    staticFile(`${materialRoot}/Metal049A_1K-JPG_Color.jpg`),
    staticFile(`${materialRoot}/Metal049A_1K-JPG_Metalness.jpg`),
    staticFile(`${materialRoot}/Metal049A_1K-JPG_NormalGL.jpg`),
    staticFile(`${materialRoot}/Metal049A_1K-JPG_Roughness.jpg`),
  ]);

  return useMemo(() => {
    const [color, metalness, normal, roughness] = maps.map((map) => map.clone());
    for (const map of [color, metalness, normal, roughness]) {
      map.wrapS = RepeatWrapping;
      map.wrapT = RepeatWrapping;
      map.repeat.set(2.2, 5.2);
      map.needsUpdate = true;
    }
    color.colorSpace = SRGBColorSpace;
    return { color, metalness, normal, roughness };
  }, [maps]);
}

function useGalvanizedMaterial(maps: DuctMaterialMaps, side = DoubleSide) {
  return useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color("#899397"),
        map: maps.color,
        metalnessMap: maps.metalness,
        metalness: 0.88,
        normalMap: maps.normal,
        normalScale: new Vector2(0.18, 0.18),
        roughnessMap: maps.roughness,
        roughness: 0.5,
        envMapIntensity: 1.12,
        side,
      }),
    [maps, side],
  );
}

function Environment() {
  const loadedEnvironment = useLoader(
    RGBELoader,
    staticFile(`${assetRoot}/studio_small_08_1k.hdr`),
  );
  const environment = useMemo(() => {
    const configured = loadedEnvironment.clone();
    configured.mapping = EquirectangularReflectionMapping;
    return configured;
  }, [loadedEnvironment]);

  return (
    <>
      <color attach="background" args={["#111820"]} />
      <primitive attach="environment" object={environment} />
    </>
  );
}

function DuctRun({
  centerZ,
  depth,
  height,
  material,
  width,
  x = 0,
  y = 0,
}: {
  centerZ: number;
  depth: number;
  height: number;
  material: MeshStandardMaterial;
  width: number;
  x?: number;
  y?: number;
}) {
  const gauge = 0.12;
  return (
    <group position={[x, y, 0]}>
      <mesh position={[-width / 2 - gauge / 2, 0, centerZ]} material={material}>
        <boxGeometry args={[gauge, height + gauge * 2, depth]} />
      </mesh>
      <mesh position={[width / 2 + gauge / 2, 0, centerZ]} material={material}>
        <boxGeometry args={[gauge, height + gauge * 2, depth]} />
      </mesh>
      <mesh position={[0, height / 2 + gauge / 2, centerZ]} material={material}>
        <boxGeometry args={[width, gauge, depth]} />
      </mesh>
      <mesh position={[0, -height / 2 - gauge / 2, centerZ]} material={material}>
        <boxGeometry args={[width, gauge, depth]} />
      </mesh>
    </group>
  );
}

function RectangularFrame({
  height,
  material,
  width,
  z,
  depth = 0.22,
  rail = 0.22,
  x = 0,
  y = 0,
}: {
  height: number;
  material: MeshStandardMaterial;
  width: number;
  z: number;
  depth?: number;
  rail?: number;
  x?: number;
  y?: number;
}) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, height / 2 + rail / 2, 0]} material={material}>
        <boxGeometry args={[width + rail * 2, rail, depth]} />
      </mesh>
      <mesh position={[0, -height / 2 - rail / 2, 0]} material={material}>
        <boxGeometry args={[width + rail * 2, rail, depth]} />
      </mesh>
      <mesh position={[-width / 2 - rail / 2, 0, 0]} material={material}>
        <boxGeometry args={[rail, height, depth]} />
      </mesh>
      <mesh position={[width / 2 + rail / 2, 0, 0]} material={material}>
        <boxGeometry args={[rail, height, depth]} />
      </mesh>
    </group>
  );
}

function makeTransitionPanel(
  vertices: number[],
  uvs: number[],
): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
}

function Reducer({ material }: { material: MeshStandardMaterial }) {
  const bigW = 7.6;
  const bigH = 10.8;
  const smallW = 4.9;
  const smallH = 6.9;
  const frontZ = -3.5;
  const backZ = -9;
  const offsetX = 0.55;
  const offsetY = 0.7;
  const panels = useMemo(
    () => [
      makeTransitionPanel(
        [-bigW / 2, bigH / 2, frontZ, bigW / 2, bigH / 2, frontZ, offsetX + smallW / 2, offsetY + smallH / 2, backZ, offsetX - smallW / 2, offsetY + smallH / 2, backZ],
        [0, 0, 1, 0, 1, 3, 0, 3],
      ),
      makeTransitionPanel(
        [bigW / 2, -bigH / 2, frontZ, -bigW / 2, -bigH / 2, frontZ, offsetX - smallW / 2, offsetY - smallH / 2, backZ, offsetX + smallW / 2, offsetY - smallH / 2, backZ],
        [0, 0, 1, 0, 1, 3, 0, 3],
      ),
      makeTransitionPanel(
        [-bigW / 2, -bigH / 2, frontZ, -bigW / 2, bigH / 2, frontZ, offsetX - smallW / 2, offsetY + smallH / 2, backZ, offsetX - smallW / 2, offsetY - smallH / 2, backZ],
        [0, 0, 1, 0, 1, 3, 0, 3],
      ),
      makeTransitionPanel(
        [bigW / 2, bigH / 2, frontZ, bigW / 2, -bigH / 2, frontZ, offsetX + smallW / 2, offsetY - smallH / 2, backZ, offsetX + smallW / 2, offsetY + smallH / 2, backZ],
        [0, 0, 1, 0, 1, 3, 0, 3],
      ),
    ],
    [backZ, frontZ],
  );

  return (
    <group>
      {panels.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={material} />
      ))}
    </group>
  );
}

function Fasteners({ material }: { material: MeshStandardMaterial }) {
  const points = [
    [-3.35, 5.58],
    [0, 5.58],
    [3.35, 5.58],
    [-3.35, -5.58],
    [0, -5.58],
    [3.35, -5.58],
    [-3.98, 3.6],
    [-3.98, 0],
    [-3.98, -3.6],
    [3.98, 3.6],
    [3.98, 0],
    [3.98, -3.6],
  ];
  return (
    <group>
      {points.map(([x, y], index) => (
        <mesh
          key={index}
          position={[x, y, 4.3]}
          rotation={[Math.PI / 2, 0, 0]}
          material={material}
        >
          <cylinderGeometry args={[0.065, 0.065, 0.075, 16]} />
        </mesh>
      ))}
    </group>
  );
}

function SeamAndReinforcement({ material }: { material: MeshStandardMaterial }) {
  return (
    <group>
      <mesh position={[-3.72, 3.45, 0.2]} material={material}>
        <boxGeometry args={[0.08, 0.16, 7.2]} />
      </mesh>
      <mesh position={[3.72, -2.8, 0.25]} material={material}>
        <boxGeometry args={[0.08, 0.16, 7.1]} />
      </mesh>
      <mesh position={[0, 5.34, 0.1]} material={material}>
        <boxGeometry args={[0.12, 0.08, 7.3]} />
      </mesh>
      <RectangularFrame width={7.6} height={10.8} z={0.6} material={material} rail={0.13} depth={0.12} />
      <RectangularFrame width={7.6} height={10.8} z={-3.38} material={material} rail={0.18} depth={0.18} />
      <RectangularFrame width={4.9} height={6.9} x={0.55} y={0.7} z={-9.02} material={material} rail={0.16} depth={0.16} />
      <RectangularFrame width={4.9} height={6.9} x={0.55} y={0.7} z={-13.2} material={material} rail={0.12} depth={0.12} />
    </group>
  );
}

function Scene() {
  const maps = useDuctMaterialMaps();
  const material = useGalvanizedMaterial(maps);
  const darkerMaterial = useMemo(
    () => {
      const cloned = material.clone();
      cloned.color = new Color("#68747a");
      cloned.roughness = 0.6;
      cloned.envMapIntensity = 0.85;
      return cloned;
    },
    [material],
  );

  return (
    <>
      <Environment />
      <ambientLight intensity={0.035} color="#b8d6ed" />
      <directionalLight position={[-6, 9, 12]} intensity={0.9} color="#f0f7f8" />
      <directionalLight position={[7, -3, 7]} intensity={0.42} color="#79a6c1" />
      <DuctRun width={7.6} height={10.8} depth={7.5} centerZ={0.25} material={material} />
      <Reducer material={material} />
      <DuctRun width={4.9} height={6.9} depth={11} centerZ={-14.5} x={0.55} y={0.7} material={darkerMaterial} />
      <RectangularFrame width={7.6} height={10.8} z={4.08} material={material} rail={0.3} depth={0.34} />
      <Fasteners material={darkerMaterial} />
      <SeamAndReinforcement material={darkerMaterial} />
      <mesh position={[0.55, 0.7, -20.1]} material={darkerMaterial}>
        <boxGeometry args={[4.9, 6.9, 0.12]} />
      </mesh>
    </>
  );
}

export function DuctHeroFrame() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#111820" }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        camera={{
          fov: 40,
          near: 0.1,
          far: 100,
          position: [5.4, -1.9, 26],
        }}
        gl={{ antialias: true }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0.1, 0.3, -5.4);
          gl.toneMappingExposure = 0.76;
        }}
      >
        <Scene />
      </ThreeCanvas>
    </AbsoluteFill>
  );
}
