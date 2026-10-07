import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, Line, OrbitControls, RoundedBox } from '@react-three/drei';
import { CanvasTexture, Color, DoubleSide, Plane, RepeatWrapping, Shape, Vector2, Vector3, type OrthographicCamera } from 'three';
import { house } from '../domain/house';
import { furnitureCorners, wallOverlaps } from '../domain/editor';
import type { Design, Fitting, FloorId, FurnitureItem, HouseFloor, Point, Room, Selection, Wall } from '../domain/types';

type SceneProps = { design: Design; floorId: FloorId; view: '3d' | 'top'; walls: 'cutaway' | 'full' | 'hidden'; selection: Selection; resetToken: number; zoomToken: number; select: (selection: Selection) => void; move: (id: string, position: Point, commit: boolean) => void; cancelMove: () => void };
const darken = (colour: string, amount = 0.8) => `#${new Color(colour).multiplyScalar(amount).getHexString()}`;

function Block({ position, size, colour, round = false }: { position: [number, number, number]; size: [number, number, number]; colour: string; round?: boolean }) {
  const material = <meshStandardMaterial color={colour} roughness={0.85} />;
  return round ? <RoundedBox position={position} args={size} radius={Math.min(...size) * 0.12} smoothness={2} castShadow receiveShadow>{material}</RoundedBox> : <mesh position={position} castShadow receiveShadow><boxGeometry args={size} />{material}</mesh>;
}

function FurnitureModel({ item }: { item: FurnitureItem }) {
  const { width, depth, height } = item.dimensions;
  const colour = item.colour;
  const leg = darken(colour, 0.6);
  const legs = (top: number) => [-1, 1].flatMap((horizontal) => [-1, 1].map((vertical) => <Block key={`${horizontal}-${vertical}`} position={[horizontal * width * 0.37, top / 2, vertical * depth * 0.36]} size={[0.055, top, 0.055]} colour={leg} />));
  if (['sofa', 'armchair', 'bench'].includes(item.templateId)) return <>
    {legs(height * 0.18)}<Block position={[0, height * 0.36, 0]} size={[width, height * 0.32, depth]} colour={darken(colour, 0.94)} round />
    {item.templateId !== 'bench' && <><Block position={[0, height * 0.72, -depth * 0.39]} size={[width, height * 0.55, depth * 0.22]} colour={colour} round />{[-1, 1].map((side) => <Block key={side} position={[side * width * 0.45, height * 0.59, 0]} size={[width * 0.1, height * 0.42, depth]} colour={colour} round />)}{Array.from({ length: item.templateId === 'sofa' ? 3 : 1 }, (_, index) => <Block key={index} position={[(index - (item.templateId === 'sofa' ? 1 : 0)) * width * 0.26, height * 0.55, depth * 0.06]} size={[width * (item.templateId === 'sofa' ? 0.25 : 0.78), height * 0.15, depth * 0.65]} colour={colour} round />)}</>}
  </>;
  if (['dining-chair', 'desk-chair'].includes(item.templateId)) return <>{legs(height * 0.47)}<Block position={[0, height * 0.52, 0]} size={[width, height * 0.12, depth]} colour={colour} round /><Block position={[0, height * 0.78, -depth * 0.44]} size={[width, height * 0.44, depth * 0.12]} colour={colour} round /></>;
  if (['dining-table', 'coffee-table', 'desk', 'bedside-table'].includes(item.templateId)) return <>{legs(height * 0.9)}<Block position={[0, height * 0.95, 0]} size={[width, height * 0.1, depth]} colour={colour} round />{item.templateId === 'bedside-table' && <Block position={[0, height * 0.6, 0]} size={[width * 0.9, height * 0.5, depth * 0.9]} colour={colour} />}</>;
  if (item.templateId.includes('bed')) return <>
    <Block position={[0, height * 0.34, 0]} size={[width, height * 0.5, depth]} colour="#b5a58e" round />
    <Block position={[0, height * 0.65, 0]} size={[width * 0.97, height * 0.25, depth * 0.97]} colour="#f5f1e8" round />
    <Block position={[0, height * 0.8, depth * 0.14]} size={[width * 0.98, height * 0.12, depth * 0.7]} colour={colour} round />
    <Block position={[0, height * 0.5, -depth * 0.47]} size={[width, height, depth * 0.05]} colour="#c8b89c" round />
    {[-1, 1].map((side) => <Block key={side} position={[side * width * 0.23, height * 0.84, -depth * 0.32]} size={[width * 0.42, height * 0.14, depth * 0.22]} colour="#faf8f1" round />)}
  </>;
  if (item.templateId === 'rug') return <Block position={[0, height / 2, 0]} size={[width, height, depth]} colour={colour} round />;
  if (item.templateId === 'floor-lamp') return <>
    <mesh position={[0, 0.03, 0]} castShadow><cylinderGeometry args={[width * 0.45, width * 0.45, 0.06, 20]} /><meshStandardMaterial color={leg} /></mesh>
    <mesh position={[0, height * 0.42, 0]} castShadow><cylinderGeometry args={[0.015, 0.015, height * 0.8, 8]} /><meshStandardMaterial color={leg} /></mesh>
    <mesh position={[0, height * 0.89, 0]} castShadow><cylinderGeometry args={[width * 0.25, width * 0.5, height * 0.22, 24, 1, true]} /><meshStandardMaterial color={colour} side={DoubleSide} /></mesh>
  </>;
  if (item.templateId === 'plant') return <>
    <mesh position={[0, height * 0.18, 0]} castShadow><cylinderGeometry args={[width * 0.37, width * 0.28, height * 0.36, 16]} /><meshStandardMaterial color="#bba58a" /></mesh>
    <Block position={[0, height * 0.56, 0]} size={[0.025, height * 0.55, 0.025]} colour={leg} />
    {Array.from({ length: 7 }, (_, index) => <mesh key={index} position={[Math.sin(index * 2.4) * width * 0.23, height * (0.58 + index * 0.04), Math.cos(index * 2.4) * depth * 0.23]} rotation={[0.3, index, 0.55]} scale={[width * 0.21, height * 0.25, depth * 0.12]} castShadow><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={index % 2 ? colour : darken(colour, 0.85)} /></mesh>)}
  </>;
  if (item.templateId === 'bookcase') return <>{[-1, 1].map((side) => <Block key={side} position={[side * width * 0.47, height / 2, 0]} size={[width * 0.06, height, depth]} colour={colour} />)}{Array.from({ length: 5 }, (_, index) => <Block key={index} position={[0, index * height / 4 + 0.025, 0]} size={[width, 0.05, depth]} colour={colour} />)}<Block position={[0, height / 2, -depth * 0.46]} size={[width, height, 0.035]} colour={colour} /></>;
  return <><Block position={[0, height / 2, 0]} size={[width, height, depth]} colour={colour} round />{item.templateId === 'wardrobe' ? <><Block position={[0, height / 2, depth * 0.502]} size={[0.012, height * 0.93, 0.006]} colour={darken(colour)} />{[-1, 1].map((side) => <Block key={side} position={[side * width * 0.05, height * 0.48, depth * 0.52]} size={[0.025, 0.15, 0.025]} colour={leg} />)}</> : Array.from({ length: 3 }, (_, index) => <Block key={index} position={[0, (index + 0.5) * height / 3, depth * 0.51]} size={[width * 0.95, 0.015, 0.009]} colour={darken(colour)} />)}</>;
}

const floorPlane = new Plane(new Vector3(0, 1, 0), 0);
function Furniture({ item, selected, select, move, cancelMove }: { item: FurnitureItem; selected: boolean; select: SceneProps['select']; move: SceneProps['move']; cancelMove: () => void }) {
  const controls = useThree((state) => state.controls) as unknown as { enabled: boolean } | undefined;
  const drag = useRef<{ offset: Point; last: Point } | null>(null);
  const warning = wallOverlaps(item).length > 0;
  const points = furnitureCorners(item).map((point) => new Vector3(point.x, 0.04, point.z));
  points.push(points[0]);
  const positionFromEvent = (event: ThreeEvent<PointerEvent>) => { const point = event.ray.intersectPlane(floorPlane, new Vector3()); return point && drag.current ? { x: point.x + drag.current.offset.x, z: point.z + drag.current.offset.z } : null; };
  return <>
    <group position={[item.position.x, 0.02, item.position.z]} rotation={[0, -item.rotation * Math.PI / 180, 0]}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (!selected) { select({ type: 'furniture', id: item.id }); return; }
        const point = event.ray.intersectPlane(floorPlane, new Vector3());
        if (!point) return;
        if (controls) controls.enabled = false;
        drag.current = { offset: { x: item.position.x - point.x, z: item.position.z - point.z }, last: item.position };
        (event.target as Element).setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => { if (!drag.current) return; event.stopPropagation(); const position = positionFromEvent(event); if (position) { drag.current.last = position; move(item.id, position, false); } }}
      onPointerUp={(event) => { if (!drag.current) return; event.stopPropagation(); const position = drag.current.last; drag.current = null; if (controls) controls.enabled = true; (event.target as Element).releasePointerCapture(event.pointerId); move(item.id, position, true); }}
      onPointerCancel={() => { drag.current = null; if (controls) controls.enabled = true; cancelMove(); }}
      onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = selected ? 'grab' : 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}>
      <FurnitureModel item={item} />
    </group>
    {(selected || warning) && <Line points={points} color={warning ? '#b6783c' : '#637a70'} lineWidth={selected ? 2 : 1} />}
  </>;
}

function WallModel({ wall, design, height, selection, select }: { wall: Wall; design: Design; height: number; selection: Selection; select: SceneProps['select'] }) {
  const length = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
  const cuts = [...new Set([0, length, ...wall.openings.flatMap((opening) => [opening.start, opening.start + opening.width])])].sort((left, right) => left - right);
  const selectedFace = selection?.type === 'wall' ? selection.id : null;
  const materials = ['#dfdcd3', '#dfdcd3', '#f5f2eb', '#dfdcd3', design.wallColours[wall.faces[0].id], design.wallColours[wall.faces[1].id]].map((colour, index) => <meshStandardMaterial key={index} attach={`material-${index}`} color={colour} roughness={0.9} emissive={wall.faces[index === 5 ? 1 : 0].id === selectedFace && index >= 4 ? '#8b9b86' : '#000000'} emissiveIntensity={0.12} />);
  const pieces: ReactNode[] = [];
  const box = (key: string, start: number, end: number, bottom: number, top: number) => {
    if (top <= bottom || end <= start) return;
    pieces.push(<mesh key={key} position={[(start + end) / 2, (bottom + top) / 2, 0]} castShadow receiveShadow onClick={(event) => { event.stopPropagation(); select({ type: 'wall', id: wall.faces[event.face?.materialIndex === 5 ? 1 : 0].id }); }}><boxGeometry args={[end - start, top - bottom, house.wallThickness]} />{materials}</mesh>);
  };
  cuts.slice(0, -1).forEach((start, index) => {
    const end = cuts[index + 1]; const midpoint = (start + end) / 2;
    const opening = wall.openings.find((opening) => midpoint >= opening.start && midpoint <= opening.start + opening.width);
    if (!opening) box(`solid-${index}`, start, end, 0, height);
    else { box(`below-${index}`, start, end, 0, Math.min(height, opening.bottom)); box(`above-${index}`, start, end, opening.bottom + opening.height, height); }
  });
  return <group position={[wall.start.x, 0, wall.start.z]} rotation={[0, -Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x), 0]}>
    {pieces}
    {wall.openings.map((opening, index) => opening.type === 'window' ? <group key={index} position={[opening.start + opening.width / 2, Math.min(height + 0.025, opening.bottom + opening.height / 2), 0]}>
      <mesh><boxGeometry args={[opening.width, Math.max(0.06, Math.min(opening.height, height - opening.bottom)), 0.035]} /><meshStandardMaterial color="#d5e3e3" transparent opacity={0.48} roughness={0.1} /></mesh>
      <Block position={[0, Math.max(0.06, Math.min(opening.height, height - opening.bottom)) / 2, 0]} size={[opening.width, 0.035, 0.09]} colour="#e5e5de" />
    </group> : <group key={index} position={[opening.start, 0, 0]}>
      <Line points={Array.from({ length: 17 }, (_, step) => { const angle = step / 16 * Math.PI / 2; return [Math.cos(angle) * opening.width, 0.025, Math.sin(angle) * opening.width] as [number, number, number]; })} color="#c4baaa" lineWidth={0.5} />
      <Block position={[opening.width / 2, 0.028, 0]} size={[opening.width, 0.025, 0.12]} colour="#c5b69a" />
    </group>)}
  </group>;
}

function floorTexture(material: string) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, 256, 256);
  if (material === 'wood') {
    for (let index = 0; index < 8; index++) { context.fillStyle = index % 3 === 0 ? '#eeeae2' : '#f8f6f1'; context.fillRect(index * 32, 0, 31, 256); context.strokeStyle = '#dbd6ca'; context.beginPath(); context.moveTo(index * 32, 0); context.lineTo(index * 32, 256); context.stroke(); context.beginPath(); context.moveTo(index * 32, (index % 3) * 85); context.lineTo((index + 1) * 32, (index % 3) * 85); context.stroke(); }
    for (let index = 0; index < 150; index++) { context.fillStyle = '#d1c9b833'; context.fillRect((index * 73) % 256, (index * 139) % 256, 0.5, 10 + index % 50); }
  } else if (material === 'tile') { context.strokeStyle = '#d3d3cc'; context.lineWidth = 2; context.strokeRect(0, 0, 256, 256); }
  else { for (let index = 0; index < 3000; index++) { context.fillStyle = index % 2 ? '#e4e1d799' : '#ffffff'; context.fillRect((index * 73.13) % 256, (index * 139.77) % 256, 1, 1); } }
  const texture = new CanvasTexture(canvas); texture.wrapS = texture.wrapT = RepeatWrapping; texture.repeat.set(material === 'tile' ? 2.5 : 0.8, material === 'tile' ? 2.5 : 0.8); return texture;
}

function RoomFloor({ room, design, select, selected }: { room: Room; design: Design; select: SceneProps['select']; selected: boolean }) {
  const finish = design.floorFinishes[room.id];
  const texture = useMemo(() => floorTexture(finish.material), [finish.material]);
  useEffect(() => () => texture.dispose(), [texture]);
  const shape = useMemo(() => new Shape(room.polygon.map((point) => new Vector2(point.x, -point.z))), [room]);
  const centre = { x: room.polygon.reduce((sum, point) => sum + point.x, 0) / room.polygon.length, z: room.polygon.reduce((sum, point) => sum + point.z, 0) / room.polygon.length };
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow onClick={(event) => { event.stopPropagation(); select({ type: 'room', id: room.id }); }}><shapeGeometry args={[shape]} /><meshStandardMaterial map={texture} color={finish.colour} roughness={0.95} emissive={selected ? '#7e8e79' : '#000000'} emissiveIntensity={0.08} /></mesh>
    {!/cupboard|wardrobe|wc|landing/.test(room.id) && <Html center position={[centre.x, 0.03, centre.z]} zIndexRange={[2, 0]} wrapperClass="room-label-wrapper" style={{ pointerEvents: 'none' }}><span className="room-label">{room.name}</span></Html>}
  </>;
}

function FixedFitting({ fitting }: { fitting: Fitting }) {
  const { width, depth, height } = fitting.dimensions;
  return <group position={[fitting.position.x, 0.02, fitting.position.z]} rotation={[0, -fitting.rotation * Math.PI / 180, 0]}>
    {fitting.type === 'counter' ? <><Block position={[0, height / 2, 0]} size={[width, height, depth]} colour="#cfc5af" /><Block position={[0, height, 0]} size={[width + 0.025, 0.055, depth + 0.025]} colour="#eeebe2" />{Array.from({ length: Math.max(1, Math.round(width / 0.6)) }, (_, index) => <Block key={index} position={[-width / 2 + (index + 0.5) * width / Math.max(1, Math.round(width / 0.6)), height * 0.6, depth / 2 + 0.01]} size={[0.1, 0.012, 0.02]} colour="#9f998a" />)}</> : fitting.type === 'hob' ? <><Block position={[0, height, 0]} size={[width, 0.025, depth]} colour="#343b38" />{[-1, 1].flatMap((x) => [-1, 1].map((z) => <mesh key={`${x}-${z}`} position={[x * width * 0.24, height + 0.017, z * depth * 0.24]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[width * 0.13, 16]} /><meshStandardMaterial color="#151e1a" /></mesh>))}</> : fitting.type === 'toilet' ? <><Block position={[0, height * 0.52, depth * 0.16]} size={[width * 0.72, height * 0.6, depth * 0.66]} colour="#f4f3ed" round /><Block position={[0, height * 0.78, -depth * 0.33]} size={[width, height * 0.42, depth * 0.27]} colour="#f7f6f0" round /><mesh position={[0, height * 0.81, depth * 0.12]} rotation={[-Math.PI / 2, 0, 0]} scale={[width * 0.43, depth * 0.42, 1]}><ringGeometry args={[0.65, 1, 24]} /><meshStandardMaterial color="#e7e8e1" side={DoubleSide} /></mesh></> : fitting.type === 'sink' ? <><Block position={[0, height * 0.53, 0]} size={[width, height * 0.95, depth]} colour="#d3c9b5" /><Block position={[0, height, 0]} size={[width + 0.02, 0.07, depth + 0.02]} colour="#f4f3ed" round /><Block position={[0, height + 0.038, 0]} size={[width * 0.68, 0.008, depth * 0.62]} colour="#bec5bf" round /><Block position={[0, height + 0.1, -depth * 0.34]} size={[0.025, 0.16, 0.035]} colour="#9ca5a1" /></> : <><Block position={[0, height / 2, 0]} size={[width, height, depth]} colour="#f6f5ef" round /><Block position={[0, height + 0.006, 0]} size={[width * 0.75, 0.012, depth * 0.86]} colour="#dce3df" round />{fitting.type === 'shower' && <Block position={[width / 2, 0.62, 0]} size={[0.03, 1.15, depth]} colour="#d8e3df" />}</>}
  </group>;
}

function Stairs({ floor }: { floor: HouseFloor }) {
  return <group position={[floor.id === 'ground' ? 4.67 : 3.64, floor.id === 'ground' ? 0 : -1.0, 0.28]}>
    {Array.from({ length: 10 }, (_, index) => <Block key={index} position={[0, (index + 1) * 0.10, index * 0.18]} size={[floor.id === 'ground' ? 0.77 : 0.65, 0.1, 0.19]} colour={index % 2 ? '#d8d2c4' : '#e4dfd2'} />)}
  </group>;
}

function CameraRig({ view, resetToken, zoomToken }: Pick<SceneProps, 'view' | 'resetToken' | 'zoomToken'>) {
  const { camera, size, invalidate } = useThree();
  const controls = useThree((state) => state.controls) as unknown as { target: Vector3; update: () => void } | undefined;
  useEffect(() => {
    const centre = new Vector3(house.width / 2, 0, house.depth / 2);
    camera.position.copy(centre).add(view === 'top' ? new Vector3(0, 15, 0.001) : new Vector3(10, 12, 10));
    camera.up.set(0, 1, 0); camera.lookAt(centre);
    (camera as OrthographicCamera).zoom = Math.max(12, Math.min((size.width - 36) / (view === 'top' ? house.width + 0.8 : house.width + house.depth * 0.65), (size.height - 60) / (view === 'top' ? house.depth + 0.8 : house.depth * 0.55 + 3.2)));
    camera.updateProjectionMatrix(); controls?.target.copy(centre); controls?.update(); invalidate();
  }, [view, resetToken, size.width, size.height, camera, controls, invalidate]);
  const previousZoom = useRef(zoomToken);
  useEffect(() => { const difference = zoomToken - previousZoom.current; previousZoom.current = zoomToken; if (difference) { (camera as OrthographicCamera).zoom = Math.max(10, Math.min(180, (camera as OrthographicCamera).zoom * 1.2 ** difference)); camera.updateProjectionMatrix(); invalidate(); } }, [zoomToken, camera, invalidate]);
  return null;
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="scene-error"><h2>The 3D view is unavailable.</h2><p>Use a browser with WebGL support. Your saved designs remain on the server.</p></div> : this.props.children; }
}

export function Scene(props: SceneProps) {
  const floor = house.floors.find((floor) => floor.id === props.floorId)!;
  const [ready, setReady] = useState(false);
  const wallHeight = props.walls === 'full' ? house.wallHeight : 1.02;
  return <div className="scene" data-testid="scene" data-ready={ready}>
    <SceneBoundary><Canvas orthographic shadows frameloop="demand" dpr={[1, 1.5]} camera={{ position: [14, 12, 14], near: 0.1, far: 100 }} gl={{ antialias: true, alpha: true }} onCreated={() => setReady(true)} onPointerMissed={() => props.select(null)}>
      <ambientLight intensity={1.35} /><hemisphereLight args={['#ffffff', '#d0c9b8', 1.0]} /><directionalLight position={[-3, 10, 2]} intensity={2.1} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.001} shadow-normalBias={0.025} />
      {(floor.id === 'first' ? [[0, 0, 3.29, house.depth], [3.99, 0, house.width, house.depth], [3.29, 0, 3.99, 0.18], [3.29, 2.08, 3.99, house.depth]] : [[0, 0, house.width, house.depth]]).map(([left, top, right, bottom], index) => <mesh key={index} position={[(left + right) / 2, -0.09, (top + bottom) / 2]} receiveShadow><boxGeometry args={[right - left, 0.18, bottom - top]} /><meshStandardMaterial color="#d7d2c7" roughness={0.95} /></mesh>)}
      {floor.rooms.map((room) => <RoomFloor key={room.id} room={room} design={props.design} select={props.select} selected={props.selection?.type === 'room' && props.selection.id === room.id} />)}
      {props.walls !== 'hidden' && floor.walls.map((wall) => <WallModel key={wall.id} wall={wall} design={props.design} height={wallHeight} selection={props.selection} select={props.select} />)}
      {floor.fittings.map((fitting) => <FixedFitting key={fitting.id} fitting={fitting} />)}<Stairs floor={floor} />
      {props.design.furniture.filter((item) => item.floorId === floor.id).map((item) => <Furniture key={item.id} item={item} selected={props.selection?.type === 'furniture' && props.selection.id === item.id} select={props.select} move={props.move} cancelMove={props.cancelMove} />)}
      <OrbitControls makeDefault target={[house.width / 2, 0, house.depth / 2]} enableRotate={props.view === '3d'} minPolarAngle={props.view === 'top' ? 0 : 0.12} maxPolarAngle={Math.PI / 2.25} minZoom={10} maxZoom={180} enableDamping dampingFactor={0.12} />
      <CameraRig view={props.view} resetToken={props.resetToken} zoomToken={props.zoomToken} />
    </Canvas></SceneBoundary>
  </div>;
}
