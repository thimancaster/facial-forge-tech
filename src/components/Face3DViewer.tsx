import { useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
import * as THREE from "three";

export interface InjectionPoint {
  id: string;
  muscle: "procerus" | "corrugator_left" | "corrugator_right" | "frontalis";
  x: number;
  y: number;
  depth: "superficial" | "deep";
  dosage: number;
  notes?: string;
}

interface Face3DViewerProps {
  injectionPoints: InjectionPoint[];
  onPointClick?: (point: InjectionPoint) => void;
  onPointDosageChange?: (pointId: string, newDosage: number) => void;
  isLoading?: boolean;
}

// Color mapping for muscles
const MUSCLE_COLORS: Record<string, string> = {
  procerus: "#F59E0B",
  corrugator_left: "#8B5CF6",
  corrugator_right: "#8B5CF6",
  frontalis: "#10B981",
};

// Convert 2D percentage coordinates to 3D face positions
function percentTo3D(x: number, y: number): [number, number, number] {
  // Map percentages to 3D coordinates on a head model
  // x: 0-100 -> -1.5 to 1.5
  // y: 0-100 -> 2 to -2 (inverted for 3D)
  const x3d = ((x - 50) / 50) * 1.2;
  const y3d = ((50 - y) / 50) * 1.5 + 0.5;
  const z3d = Math.sqrt(Math.max(0, 1.8 - x3d * x3d * 0.3)) * 0.8 + 0.3;
  return [x3d, y3d, z3d];
}

// Injection point sphere component
function InjectionPointMesh({ 
  point, 
  onClick,
  isSelected 
}: { 
  point: InjectionPoint; 
  onClick?: () => void;
  isSelected?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const position = percentTo3D(point.x, point.y);
  const color = MUSCLE_COLORS[point.muscle] || "#F59E0B";

  useFrame((state) => {
    if (meshRef.current) {
      // Pulse animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      meshRef.current.scale.setScalar(hovered || isSelected ? scale * 1.3 : scale);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={hovered || isSelected ? 0.8 : 0.3}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      
      {/* Outer ring for depth indication */}
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[0.1, 0.12, 32]} />
        <meshBasicMaterial 
          color={point.depth === "deep" ? "#EF4444" : "#22C55E"} 
          side={THREE.DoubleSide}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Tooltip on hover */}
      {hovered && (
        <Html distanceFactor={10} style={{ pointerEvents: "none" }}>
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
            <p className="font-medium text-sm capitalize">{point.muscle.replace("_", " ")}</p>
            <p className="text-xs text-muted-foreground">{point.dosage}U • {point.depth}</p>
            {point.notes && <p className="text-xs text-muted-foreground mt-1">{point.notes}</p>}
          </div>
        </Html>
      )}
    </group>
  );
}

// Procedural face geometry
function FaceModel() {
  return (
    <group>
      {/* Head - main ellipsoid */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.8, 64, 64]} />
        <meshStandardMaterial 
          color="#E8D5C4"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      
      {/* Forehead protrusion */}
      <mesh position={[0, 0.9, 0.6]}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial 
          color="#E8D5C4"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Nose */}
      <mesh position={[0, -0.1, 1.4]}>
        <coneGeometry args={[0.2, 0.8, 16]} />
        <meshStandardMaterial 
          color="#DEC9B8"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* Nose bridge */}
      <mesh position={[0, 0.4, 1.1]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.15, 0.6, 0.3]} />
        <meshStandardMaterial 
          color="#E0CABC"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Brow ridge left */}
      <mesh position={[-0.5, 0.6, 1.0]} rotation={[0, 0.2, 0.1]}>
        <capsuleGeometry args={[0.12, 0.5, 8, 16]} />
        <meshStandardMaterial 
          color="#DEC5B5"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Brow ridge right */}
      <mesh position={[0.5, 0.6, 1.0]} rotation={[0, -0.2, -0.1]}>
        <capsuleGeometry args={[0.12, 0.5, 8, 16]} />
        <meshStandardMaterial 
          color="#DEC5B5"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Eye socket left */}
      <mesh position={[-0.5, 0.3, 1.1]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial 
          color="#C9B8A8"
          roughness={0.8}
          metalness={0.0}
        />
      </mesh>

      {/* Eye socket right */}
      <mesh position={[0.5, 0.3, 1.1]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial 
          color="#C9B8A8"
          roughness={0.8}
          metalness={0.0}
        />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.5, 0.3, 1.25]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
      </mesh>
      <mesh position={[0.5, 0.3, 1.25]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
      </mesh>

      {/* Pupils */}
      <mesh position={[-0.5, 0.3, 1.36]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#3B2F2F" roughness={0.1} />
      </mesh>
      <mesh position={[0.5, 0.3, 1.36]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#3B2F2F" roughness={0.1} />
      </mesh>

      {/* Cheekbones */}
      <mesh position={[-0.8, -0.1, 0.9]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial 
          color="#E5CEBE"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0.8, -0.1, 0.9]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial 
          color="#E5CEBE"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Lips area */}
      <mesh position={[0, -0.6, 1.2]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial 
          color="#D4A89A"
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      {/* Chin */}
      <mesh position={[0, -1.0, 0.9]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial 
          color="#E0CCBE"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Muscle regions - semi-transparent overlays */}
      {/* Procerus region */}
      <mesh position={[0, 0.5, 1.15]}>
        <planeGeometry args={[0.4, 0.5]} />
        <meshBasicMaterial 
          color="#F59E0B" 
          transparent 
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Corrugator regions */}
      <mesh position={[-0.45, 0.55, 1.05]} rotation={[0, 0.3, 0.1]}>
        <planeGeometry args={[0.5, 0.25]} />
        <meshBasicMaterial 
          color="#8B5CF6" 
          transparent 
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0.45, 0.55, 1.05]} rotation={[0, -0.3, -0.1]}>
        <planeGeometry args={[0.5, 0.25]} />
        <meshBasicMaterial 
          color="#8B5CF6" 
          transparent 
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// Loading indicator
function LoadingIndicator() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 2;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 2]}>
      <torusGeometry args={[0.3, 0.05, 8, 32]} />
      <meshBasicMaterial color="#F59E0B" />
    </mesh>
  );
}

export function Face3DViewer({ 
  injectionPoints, 
  onPointClick,
  isLoading = false 
}: Face3DViewerProps) {
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const handlePointClick = (point: InjectionPoint) => {
    setSelectedPointId(point.id);
    onPointClick?.(point);
  };

  return (
    <div className="w-full h-full min-h-[400px] bg-gradient-to-b from-muted/30 to-muted/50 rounded-xl overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* Lighting setup */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
          <directionalLight position={[-5, 3, 5]} intensity={0.4} />
          <directionalLight position={[0, -3, 5]} intensity={0.2} />
          
          {/* Rim light for premium look */}
          <pointLight position={[-3, 0, -2]} intensity={0.3} color="#F59E0B" />
          <pointLight position={[3, 0, -2]} intensity={0.3} color="#8B5CF6" />

          {/* Environment for reflections */}
          <Environment preset="studio" />

          {/* Face model */}
          <FaceModel />

          {/* Injection points */}
          {injectionPoints.map((point) => (
            <InjectionPointMesh
              key={point.id}
              point={point}
              onClick={() => handlePointClick(point)}
              isSelected={selectedPointId === point.id}
            />
          ))}

          {/* Loading indicator */}
          {isLoading && <LoadingIndicator />}

          {/* Controls */}
          <OrbitControls
            enablePan={false}
            minDistance={3}
            maxDistance={8}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI * 3 / 4}
            enableDamping
            dampingFactor={0.05}
          />
        </Suspense>
      </Canvas>

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-muted-foreground">
        <span>🖱️ Arraste para rotacionar</span>
        <span>🔍 Scroll para zoom</span>
      </div>
    </div>
  );
}
