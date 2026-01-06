import { useRef, useState, Suspense, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html, Text, Billboard, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Layers, MousePointer, Plus, RotateCcw, Bone, CircleDot } from "lucide-react";

export interface InjectionPoint {
  id: string;
  muscle: string;
  x: number;
  y: number;
  depth: "superficial" | "deep";
  dosage: number;
  notes?: string;
  confidence?: number; // 0.0 - 1.0 confidence score
}

export interface SafetyZone {
  region: string;
  reason: string;
  polygon_coordinates?: Array<{ x: number; y: number }>;
}

interface Face3DViewerProps {
  injectionPoints: InjectionPoint[];
  onPointClick?: (point: InjectionPoint) => void;
  onPointDosageChange?: (pointId: string, newDosage: number) => void;
  onAddPoint?: (point: Omit<InjectionPoint, 'id'>) => void;
  isLoading?: boolean;
  showLabels?: boolean;
  showMuscles?: boolean;
  showDangerZones?: boolean;
  safetyZones?: SafetyZone[];
  useGLBModel?: boolean;
  modelOpacity?: number;
  conversionFactor?: number;
  isEditMode?: boolean;
}

// Layer visibility configuration
interface LayerConfig {
  skin: { visible: boolean; opacity: number };
  muscles: { visible: boolean; opacity: number };
  bone: { visible: boolean; opacity: number };
}

// Muscle definitions with anatomical data
const MUSCLE_DATA: Record<string, { 
  color: string; 
  label: string;
  labelPosition: [number, number, number];
}> = {
  procerus: { 
    color: "#B85450", 
    label: "Prócero",
    labelPosition: [0, 0.9, 1.6]
  },
  corrugator_left: { 
    color: "#A04040", 
    label: "Corrugador Esq.",
    labelPosition: [-0.8, 0.7, 1.3]
  },
  corrugator_right: { 
    color: "#A04040", 
    label: "Corrugador Dir.",
    labelPosition: [0.8, 0.7, 1.3]
  },
  frontalis: { 
    color: "#C06060", 
    label: "Frontal",
    labelPosition: [0, 1.5, 1.0]
  },
  orbicularis_oculi_left: {
    color: "#9F5050",
    label: "Orbicular do Olho Esq.",
    labelPosition: [-1.0, 0.3, 1.2]
  },
  orbicularis_oculi_right: {
    color: "#9F5050",
    label: "Orbicular do Olho Dir.",
    labelPosition: [1.0, 0.3, 1.2]
  },
  nasalis: {
    color: "#B06060",
    label: "Nasal",
    labelPosition: [0, 0.1, 1.8]
  },
  levator_labii: {
    color: "#A85555",
    label: "Levantador do Lábio",
    labelPosition: [-0.5, -0.2, 1.5]
  },
  zygomaticus_major: {
    color: "#AA5858",
    label: "Zigomático Maior",
    labelPosition: [0.9, -0.3, 1.0]
  },
  zygomaticus_minor: {
    color: "#A55252",
    label: "Zigomático Menor",
    labelPosition: [-0.9, -0.1, 1.1]
  },
  orbicularis_oris: {
    color: "#B06565",
    label: "Orbicular da Boca",
    labelPosition: [0, -0.7, 1.5]
  },
  depressor_anguli: {
    color: "#9A4848",
    label: "Depressor do Ângulo",
    labelPosition: [0.7, -0.9, 1.1]
  },
  mentalis: {
    color: "#A55050",
    label: "Mentual",
    labelPosition: [0, -1.2, 1.3]
  },
  masseter: {
    color: "#8B4545",
    label: "Masseter",
    labelPosition: [1.1, -0.5, 0.6]
  }
};

// Danger zones with 3D positions
const DANGER_ZONES = [
  {
    id: "orbital_margin",
    label: "Margem Orbital",
    color: "#EF4444",
    positions: [
      { center: [-0.55, 0.35, 1.35] as [number, number, number], radius: 0.25 },
      { center: [0.55, 0.35, 1.35] as [number, number, number], radius: 0.25 },
    ],
    reason: "Risco de ptose palpebral - manter 2cm acima"
  },
  {
    id: "infraorbital",
    label: "Área Infraorbital",
    color: "#F97316",
    positions: [
      { center: [-0.45, 0.1, 1.3] as [number, number, number], radius: 0.2 },
      { center: [0.45, 0.1, 1.3] as [number, number, number], radius: 0.2 },
    ],
    reason: "Risco de difusão para músculos oculares"
  },
  {
    id: "labial_commissure",
    label: "Comissura Labial",
    color: "#FBBF24",
    positions: [
      { center: [-0.35, -0.55, 1.4] as [number, number, number], radius: 0.15 },
      { center: [0.35, -0.55, 1.4] as [number, number, number], radius: 0.15 },
    ],
    reason: "Risco de assimetria do sorriso"
  },
  {
    id: "mediopupilar_line",
    label: "Linha Mediopupilar",
    color: "#A855F7",
    positions: [
      { center: [-0.55, 0.6, 1.2] as [number, number, number], radius: 0.08 },
      { center: [0.55, 0.6, 1.2] as [number, number, number], radius: 0.08 },
    ],
    reason: "Limite lateral para injeções glabelares"
  }
];

// Point colors by muscle group
function getMuscleColor(muscle: string): string {
  return MUSCLE_DATA[muscle]?.color || "#B85450";
}

// Zone type for anatomical mapping
type AnatomicalZone = 'glabella' | 'frontalis' | 'periorbital' | 'nasal' | 'perioral' | 'mentalis' | 'masseter';

// Get zone from muscle name
function getZoneFromMuscle(muscle: string): AnatomicalZone {
  const muscleLower = muscle.toLowerCase();
  if (muscleLower.includes('procerus') || muscleLower.includes('prócero') || muscleLower.includes('corrugador') || muscleLower.includes('corrugator')) {
    return 'glabella';
  }
  if (muscleLower.includes('frontal') || muscleLower.includes('frontalis')) {
    return 'frontalis';
  }
  if (muscleLower.includes('orbicular') && (muscleLower.includes('olho') || muscleLower.includes('oculi'))) {
    return 'periorbital';
  }
  if (muscleLower.includes('nasal') || muscleLower.includes('nasalis')) {
    return 'nasal';
  }
  if (muscleLower.includes('oris') || muscleLower.includes('boca') || muscleLower.includes('depressor') || muscleLower.includes('labial')) {
    return 'perioral';
  }
  if (muscleLower.includes('mentalis') || muscleLower.includes('mentual') || muscleLower.includes('queixo')) {
    return 'mentalis';
  }
  if (muscleLower.includes('masseter')) {
    return 'masseter';
  }
  return 'glabella'; // default
}

// Zone-specific curvature configuration for accurate 3D mapping
const ZONE_CONFIG: Record<AnatomicalZone, { baseZ: number; curveFactor: number; yOffset: number }> = {
  glabella: { baseZ: 1.4, curveFactor: 0.15, yOffset: 0.2 },
  frontalis: { baseZ: 1.0, curveFactor: 0.25, yOffset: 0.3 },
  periorbital: { baseZ: 1.2, curveFactor: 0.30, yOffset: 0.15 },
  nasal: { baseZ: 1.55, curveFactor: 0.10, yOffset: 0.1 },
  perioral: { baseZ: 1.4, curveFactor: 0.20, yOffset: 0.0 },
  mentalis: { baseZ: 1.2, curveFactor: 0.30, yOffset: -0.1 },
  masseter: { baseZ: 0.6, curveFactor: 0.40, yOffset: 0.0 }
};

// Convert 2D percentage coordinates to 3D face positions with zone-specific curvature
function percentTo3D(x: number, y: number, zone?: AnatomicalZone): [number, number, number] {
  const x3d = ((x - 50) / 50) * 1.4;
  const y3d = ((50 - y) / 50) * 1.8 + 0.2;
  
  if (zone && ZONE_CONFIG[zone]) {
    const config = ZONE_CONFIG[zone];
    const z3d = config.baseZ - Math.pow(Math.abs(x3d), 2) * config.curveFactor;
    return [x3d, y3d + config.yOffset, z3d];
  }
  
  // Default curvature (fallback)
  const curveFactor = 1 - Math.pow(Math.abs(x3d) / 1.4, 2) * 0.4;
  const z3d = Math.sqrt(Math.max(0.1, 2.0 - x3d * x3d * 0.5 - Math.pow((y3d - 0.3) / 2, 2) * 0.3)) * curveFactor + 0.4;
  return [x3d, y3d, z3d];
}

// Get confidence color based on score
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "#10B981"; // Green - high confidence
  if (confidence >= 0.5) return "#F59E0B"; // Yellow/Amber - medium confidence
  return "#EF4444"; // Red - low confidence
}

// Get confidence ring size based on score
function getConfidenceRingScale(confidence: number): number {
  return 0.8 + confidence * 0.4; // Scale from 0.8 to 1.2
}

// Convert 3D coordinates back to percentage
function threeDToPercent(x3d: number, y3d: number): { x: number; y: number } {
  const x = ((x3d / 1.4) * 50) + 50;
  const y = 50 - ((y3d - 0.2) / 1.8) * 50;
  return { x: Math.round(x), y: Math.round(y) };
}

// Detect muscle from 3D position
function detectMuscleFromPosition(x3d: number, y3d: number): string {
  // Glabelar region (center upper face)
  if (y3d > 0.5 && y3d < 0.9 && Math.abs(x3d) < 0.15) return "procerus";
  if (y3d > 0.4 && y3d < 0.8 && x3d < -0.2 && x3d > -0.8) return "corrugator_left";
  if (y3d > 0.4 && y3d < 0.8 && x3d > 0.2 && x3d < 0.8) return "corrugator_right";
  
  // Forehead
  if (y3d > 1.0) return "frontalis";
  
  // Periorbital
  if (y3d > 0.1 && y3d < 0.6 && x3d < -0.4) return "orbicularis_oculi_left";
  if (y3d > 0.1 && y3d < 0.6 && x3d > 0.4) return "orbicularis_oculi_right";
  
  // Nasal
  if (y3d > -0.2 && y3d < 0.3 && Math.abs(x3d) < 0.3) return "nasalis";
  
  // Perioral
  if (y3d > -0.8 && y3d < -0.3) return "orbicularis_oris";
  
  // Mentalis
  if (y3d < -0.8) return "mentalis";
  
  // Default
  return "procerus";
}

// GLB Model Component with layer support
function AnatomicalGLBModel({ 
  layers,
}: { 
  layers: LayerConfig;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/face-anatomy.glb');
  
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    
    // Apply custom materials and opacity based on layers
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (material.clone) {
            const newMaterial = material.clone();
            newMaterial.transparent = true;
            newMaterial.side = THREE.DoubleSide;
            
            // Determine layer type by mesh name or position
            const meshName = child.name.toLowerCase();
            
            if (meshName.includes('skin') || meshName.includes('face')) {
              newMaterial.opacity = layers.skin.visible ? layers.skin.opacity : 0;
            } else if (meshName.includes('muscle') || meshName.includes('musc')) {
              newMaterial.opacity = layers.muscles.visible ? layers.muscles.opacity : 0;
              newMaterial.roughness = 0.6;
              newMaterial.metalness = 0.1;
            } else if (meshName.includes('bone') || meshName.includes('skull')) {
              newMaterial.opacity = layers.bone.visible ? layers.bone.opacity : 0;
            } else {
              // Default: treat as muscle layer
              newMaterial.opacity = layers.muscles.visible ? layers.muscles.opacity : 0;
              newMaterial.roughness = 0.6;
              newMaterial.metalness = 0.1;
            }
            
            child.material = newMaterial;
          }
        }
      }
    });
    
    return clone;
  }, [scene, layers]);

  // Gentle breathing animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      <Center>
        <primitive 
          object={clonedScene} 
          scale={2.5}
          rotation={[0, 0, 0]}
        />
      </Center>
    </group>
  );
}

// Preload GLB model
useGLTF.preload('/models/face-anatomy.glb');

// Clickable surface for raycasting
function ClickableSurface({ 
  onSurfaceClick, 
  isEditMode 
}: { 
  onSurfaceClick: (point: THREE.Vector3) => void;
  isEditMode: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, raycaster, pointer } = useThree();

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (!isEditMode) return;
    event.stopPropagation();
    
    // Get intersection point
    const point = event.point;
    onSurfaceClick(point);
  }, [isEditMode, onSurfaceClick]);

  return (
    <mesh 
      ref={meshRef}
      onClick={handleClick}
      visible={isEditMode}
    >
      {/* Invisible sphere for raycasting - matches face shape */}
      <sphereGeometry args={[1.8, 64, 64]} />
      <meshBasicMaterial 
        color="#00FF00" 
        transparent 
        opacity={isEditMode ? 0.05 : 0} 
        side={THREE.FrontSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// Danger zone sphere component
function DangerZoneMesh({ 
  center, 
  radius, 
  color, 
  label,
  reason
}: { 
  center: [number, number, number];
  radius: number;
  color: string;
  label: string;
  reason: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = 0.25 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group position={center}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial 
          color={color}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Wireframe outline */}
      <mesh>
        <sphereGeometry args={[radius * 1.02, 16, 16]} />
        <meshBasicMaterial 
          color={color}
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {hovered && (
        <Html distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="bg-red-900/95 backdrop-blur-sm border border-red-500/50 rounded-lg px-4 py-3 shadow-2xl whitespace-nowrap min-w-[200px]">
            <p className="font-bold text-red-300 text-sm flex items-center gap-2">
              ⚠️ {label}
            </p>
            <p className="text-xs text-red-200 mt-1">{reason}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// Detailed fiber texture for muscles
function MuscleWithFibers({
  position,
  scale,
  rotation,
  color,
  fiberDirection = "vertical",
  opacity = 1
}: {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  fiberDirection?: "vertical" | "horizontal" | "diagonal";
  opacity?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const fibers = useMemo(() => {
    const lines: JSX.Element[] = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const offset = (i / count - 0.5) * 0.8;
      lines.push(
        <mesh key={i} position={[fiberDirection === "horizontal" ? 0 : offset, fiberDirection === "horizontal" ? offset : 0, 0.01]}>
          <planeGeometry args={[fiberDirection === "horizontal" ? 0.95 : 0.02, fiberDirection === "horizontal" ? 0.02 : 0.95]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.08 * opacity} />
        </mesh>
      );
    }
    return lines;
  }, [fiberDirection, opacity]);

  return (
    <group position={position} rotation={rotation || [0, 0, 0]} scale={scale}>
      <mesh ref={meshRef}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial 
          color={color}
          roughness={0.65}
          metalness={0.05}
          side={THREE.DoubleSide}
          transparent
          opacity={opacity}
        />
      </mesh>
      {fibers}
    </group>
  );
}

// Enhanced Diffusion Halo with gradient and time animation
function DiffusionHalo({ 
  dosage, 
  depth, 
  isSelected 
}: { 
  dosage: number; 
  depth: "superficial" | "deep";
  isSelected?: boolean;
}) {
  const innerHaloRef = useRef<THREE.Mesh>(null);
  const outerHaloRef = useRef<THREE.Mesh>(null);
  const waveRef = useRef<THREE.Mesh>(null);
  
  // Diffusion radius based on dosage (1-2cm in 3D units) - more realistic medical diffusion
  const baseRadius = 0.08 + (dosage / 25) * 0.12;
  const innerRadius = baseRadius * 0.6;
  const outerRadius = baseRadius * 1.4;
  
  // Colors based on depth
  const innerColor = depth === "deep" ? "#7C3AED" : "#10B981";
  const outerColor = depth === "deep" ? "#A855F7" : "#34D399";

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Inner halo - subtle pulsing
    if (innerHaloRef.current && innerHaloRef.current.material) {
      const material = innerHaloRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.25 + Math.sin(time * 2) * 0.08;
      innerHaloRef.current.scale.setScalar(1 + Math.sin(time * 1.5) * 0.05);
    }
    
    // Outer halo - slower pulse
    if (outerHaloRef.current && outerHaloRef.current.material) {
      const material = outerHaloRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.12 + Math.sin(time * 1.2) * 0.04;
      outerHaloRef.current.scale.setScalar(1 + Math.sin(time * 0.8) * 0.08);
    }
    
    // Wave effect - expanding ring (simulating toxin diffusion over time)
    if (waveRef.current) {
      const waveScale = ((time % 3) / 3) * 1.5 + 0.5;
      waveRef.current.scale.setScalar(waveScale);
      if (waveRef.current.material) {
        const material = waveRef.current.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, 0.3 - ((time % 3) / 3) * 0.3);
      }
    }
  });

  return (
    <group>
      {/* Inner diffusion zone - high concentration */}
      <mesh ref={innerHaloRef}>
        <sphereGeometry args={[innerRadius, 24, 24]} />
        <meshBasicMaterial 
          color={innerColor}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Outer diffusion zone - lower concentration */}
      <mesh ref={outerHaloRef}>
        <sphereGeometry args={[outerRadius, 24, 24]} />
        <meshBasicMaterial 
          color={outerColor}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Expanding wave effect - simulates diffusion propagation */}
      <mesh ref={waveRef}>
        <ringGeometry args={[innerRadius * 0.9, innerRadius * 1.1, 32]} />
        <meshBasicMaterial 
          color={innerColor}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Selected state - additional glow */}
      {isSelected && (
        <mesh>
          <sphereGeometry args={[outerRadius * 1.2, 16, 16]} />
          <meshBasicMaterial 
            color="#FFD700"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

// Injection point sphere component with enhanced diffusion visualization and confidence indicators
function InjectionPointMesh({ 
  point, 
  onClick,
  isSelected,
  showDiffusion = true
}: { 
  point: InjectionPoint; 
  onClick?: () => void;
  isSelected?: boolean;
  showDiffusion?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const confidenceRingRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Use zone-specific mapping for more accurate 3D positioning
  const zone = getZoneFromMuscle(point.muscle);
  const position = percentTo3D(point.x, point.y, zone);
  const muscleLabel = MUSCLE_DATA[point.muscle]?.label || point.muscle;
  
  // Confidence indicators
  const confidence = point.confidence ?? 0.85; // Default to 0.85 if not provided
  const confidenceColor = getConfidenceColor(confidence);
  const confidenceScale = getConfidenceRingScale(confidence);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      meshRef.current.scale.setScalar(hovered || isSelected ? scale * 1.4 : scale);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
    // Confidence ring pulsing
    if (confidenceRingRef.current) {
      const pulseIntensity = confidence < 0.5 ? 0.3 : 0.1; // Lower confidence = more pulsing
      const pulseScale = confidenceScale + Math.sin(state.clock.elapsedTime * 2) * pulseIntensity;
      confidenceRingRef.current.scale.setScalar(pulseScale);
    }
  });

  return (
    <group position={position}>
      {/* Enhanced Diffusion Simulation */}
      {showDiffusion && (
        <DiffusionHalo 
          dosage={point.dosage} 
          depth={point.depth} 
          isSelected={isSelected}
        />
      )}

      {/* Confidence indicator ring (outer) */}
      <mesh ref={confidenceRingRef} position={[0, 0, -0.01]}>
        <ringGeometry args={[0.14, 0.18, 32]} />
        <meshBasicMaterial 
          color={confidenceColor} 
          transparent 
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer glow ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.10, 0.13, 32]} />
        <meshBasicMaterial 
          color={isSelected ? "#FFD700" : "#FFFFFF"} 
          transparent 
          opacity={hovered || isSelected ? 0.9 : 0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner point */}
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
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshStandardMaterial 
          color="#DC2626"
          emissive="#DC2626"
          emissiveIntensity={hovered || isSelected ? 1.0 : 0.5}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      
      {/* Depth indicator ring */}
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[0.07, 0.09, 32]} />
        <meshBasicMaterial 
          color={point.depth === "deep" ? "#7C3AED" : "#10B981"} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Depth vector line */}
      <mesh position={[0, 0, point.depth === "deep" ? -0.15 : -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, point.depth === "deep" ? 0.3 : 0.15, 8]} />
        <meshBasicMaterial color={point.depth === "deep" ? "#7C3AED" : "#10B981"} />
      </mesh>

      {/* Dosage indicator text */}
      <Billboard position={[0, 0.20, 0]} follow={true}>
        <Text
          fontSize={0.055}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.008}
          outlineColor="#000000"
        >
          {point.dosage}U
        </Text>
      </Billboard>

      {/* Confidence badge */}
      <Billboard position={[0.12, 0.12, 0]} follow={true}>
        <Text
          fontSize={0.035}
          color={confidenceColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.004}
          outlineColor="#000000"
        >
          {Math.round(confidence * 100)}%
        </Text>
      </Billboard>

      {/* Tooltip on hover */}
      {hovered && (
        <Html distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="bg-slate-900/95 backdrop-blur-sm border border-amber-500/30 rounded-lg px-4 py-3 shadow-2xl whitespace-nowrap min-w-[200px]">
            <p className="font-bold text-amber-400 text-sm">{muscleLabel}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-white font-semibold text-lg">{point.dosage}U</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                point.depth === "deep" ? "bg-violet-500/20 text-violet-300" : "bg-emerald-500/20 text-emerald-300"
              }`}>
                {point.depth === "deep" ? "Profundo" : "Superficial"}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-400">Confiança:</span>
              <span 
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ 
                  backgroundColor: `${confidenceColor}20`, 
                  color: confidenceColor 
                }}
              >
                {Math.round(confidence * 100)}%
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-2 border-t border-slate-700 pt-2">
              <p>Zona: {zone}</p>
              <p>Difusão: ~{Math.round(0.8 + (point.dosage / 25) * 1.2)}cm</p>
              {point.notes && <p className="mt-1 text-amber-300">{point.notes}</p>}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Procedural Anatomical face (fallback if GLB fails)
function AnatomicalFaceModelProcedural({ layers }: { layers: LayerConfig }) {
  const muscleOpacity = layers.muscles.visible ? layers.muscles.opacity : 0;
  const skinOpacity = layers.skin.visible ? layers.skin.opacity : 0;
  
  return (
    <group>
      {/* Base skull/skin layer */}
      <mesh position={[0, 0, -0.1]} visible={layers.skin.visible || layers.bone.visible}>
        <sphereGeometry args={[1.7, 64, 64]} />
        <meshStandardMaterial 
          color={layers.bone.visible ? "#E8DDD0" : "#F5E6D3"}
          roughness={0.8}
          metalness={0.0}
          transparent
          opacity={layers.bone.visible ? layers.bone.opacity * 0.5 : skinOpacity * 0.3}
        />
      </mesh>

      {/* FRONTAL MUSCLE */}
      <group visible={layers.muscles.visible}>
        <MuscleWithFibers position={[-0.5, 1.3, 0.9]} scale={[0.7, 0.9, 1]} rotation={[-0.3, 0.2, 0]} color="#C06060" fiberDirection="vertical" opacity={muscleOpacity} />
        <MuscleWithFibers position={[0.5, 1.3, 0.9]} scale={[0.7, 0.9, 1]} rotation={[-0.3, -0.2, 0]} color="#C06060" fiberDirection="vertical" opacity={muscleOpacity} />
        <MuscleWithFibers position={[0, 1.4, 1.0]} scale={[0.5, 0.7, 1]} rotation={[-0.2, 0, 0]} color="#B85555" fiberDirection="vertical" opacity={muscleOpacity} />
      </group>

      {/* PROCERUS MUSCLE */}
      <group visible={layers.muscles.visible}>
        <MuscleWithFibers position={[0, 0.65, 1.25]} scale={[0.25, 0.45, 1]} rotation={[-0.1, 0, 0]} color="#B85450" fiberDirection="vertical" opacity={muscleOpacity} />
      </group>

      {/* CORRUGATOR MUSCLES */}
      <group visible={layers.muscles.visible}>
        <MuscleWithFibers position={[-0.45, 0.6, 1.15]} scale={[0.5, 0.18, 1]} rotation={[0, 0.3, 0.15]} color="#A04040" fiberDirection="horizontal" opacity={muscleOpacity} />
        <MuscleWithFibers position={[0.45, 0.6, 1.15]} scale={[0.5, 0.18, 1]} rotation={[0, -0.3, -0.15]} color="#A04040" fiberDirection="horizontal" opacity={muscleOpacity} />
      </group>

      {/* ORBICULARIS OCULI */}
      <group visible={layers.muscles.visible}>
        <mesh position={[-0.55, 0.35, 1.05]}>
          <torusGeometry args={[0.32, 0.12, 16, 32]} />
          <meshStandardMaterial color="#9F5050" roughness={0.7} metalness={0.1} transparent opacity={muscleOpacity} />
        </mesh>
        <mesh position={[0.55, 0.35, 1.05]}>
          <torusGeometry args={[0.32, 0.12, 16, 32]} />
          <meshStandardMaterial color="#9F5050" roughness={0.7} metalness={0.1} transparent opacity={muscleOpacity} />
        </mesh>
      </group>

      {/* NASALIS */}
      <group visible={layers.muscles.visible}>
        <MuscleWithFibers position={[-0.12, 0.05, 1.45]} scale={[0.15, 0.35, 1]} rotation={[0, 0.2, 0]} color="#B06060" fiberDirection="vertical" opacity={muscleOpacity} />
        <MuscleWithFibers position={[0.12, 0.05, 1.45]} scale={[0.15, 0.35, 1]} rotation={[0, -0.2, 0]} color="#B06060" fiberDirection="vertical" opacity={muscleOpacity} />
      </group>

      {/* LEVATOR LABII */}
      <group visible={layers.muscles.visible}>
        <MuscleWithFibers position={[-0.35, -0.15, 1.3]} scale={[0.2, 0.4, 1]} rotation={[0, 0.15, 0.1]} color="#A85555" fiberDirection="vertical" opacity={muscleOpacity} />
        <MuscleWithFibers position={[0.35, -0.15, 1.3]} scale={[0.2, 0.4, 1]} rotation={[0, -0.15, -0.1]} color="#A85555" fiberDirection="vertical" opacity={muscleOpacity} />
      </group>

      {/* ZYGOMATICUS MAJOR */}
      <group visible={layers.muscles.visible}>
        <MuscleWithFibers position={[-0.7, -0.2, 1.0]} scale={[0.55, 0.18, 1]} rotation={[0, 0.4, 0.5]} color="#AA5858" fiberDirection="horizontal" opacity={muscleOpacity} />
        <MuscleWithFibers position={[0.7, -0.2, 1.0]} scale={[0.55, 0.18, 1]} rotation={[0, -0.4, -0.5]} color="#AA5858" fiberDirection="horizontal" opacity={muscleOpacity} />
      </group>

      {/* ORBICULARIS ORIS */}
      <group visible={layers.muscles.visible}>
        <mesh position={[0, -0.55, 1.35]}>
          <torusGeometry args={[0.22, 0.1, 16, 32]} />
          <meshStandardMaterial color="#B06565" roughness={0.65} metalness={0.1} transparent opacity={muscleOpacity} />
        </mesh>
      </group>

      {/* MENTALIS */}
      <group visible={layers.muscles.visible}>
        <MuscleWithFibers position={[0, -1.0, 1.1]} scale={[0.35, 0.35, 1]} rotation={[-0.2, 0, 0]} color="#A55050" fiberDirection="vertical" opacity={muscleOpacity} />
      </group>

      {/* MASSETER */}
      <group visible={layers.muscles.visible}>
        <MuscleWithFibers position={[-0.95, -0.4, 0.6]} scale={[0.4, 0.6, 1]} rotation={[0, 0.5, 0]} color="#8B4545" fiberDirection="vertical" opacity={muscleOpacity} />
        <MuscleWithFibers position={[0.95, -0.4, 0.6]} scale={[0.4, 0.6, 1]} rotation={[0, -0.5, 0]} color="#8B4545" fiberDirection="vertical" opacity={muscleOpacity} />
      </group>

      {/* EYES */}
      <group visible={layers.skin.visible}>
        <mesh position={[-0.55, 0.35, 1.25]}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial color="#FAFAFA" roughness={0.1} metalness={0.1} />
        </mesh>
        <mesh position={[-0.55, 0.35, 1.38]}>
          <sphereGeometry args={[0.08, 32, 32]} />
          <meshStandardMaterial color="#4A3728" roughness={0.2} />
        </mesh>
        <mesh position={[-0.55, 0.35, 1.44]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.1} />
        </mesh>
        <mesh position={[0.55, 0.35, 1.25]}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial color="#FAFAFA" roughness={0.1} metalness={0.1} />
        </mesh>
        <mesh position={[0.55, 0.35, 1.38]}>
          <sphereGeometry args={[0.08, 32, 32]} />
          <meshStandardMaterial color="#4A3728" roughness={0.2} />
        </mesh>
        <mesh position={[0.55, 0.35, 1.44]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.1} />
        </mesh>
      </group>

      {/* NOSE */}
      <mesh position={[0, -0.15, 1.55]} visible={layers.skin.visible}>
        <sphereGeometry args={[0.15, 24, 24]} />
        <meshStandardMaterial color="#E8D0C0" roughness={0.7} metalness={0.0} transparent opacity={skinOpacity} />
      </mesh>

      {/* LIPS */}
      <mesh position={[0, -0.55, 1.5]} visible={layers.skin.visible}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial color="#C9908A" roughness={0.5} metalness={0.1} transparent opacity={skinOpacity} />
      </mesh>
    </group>
  );
}

// Muscle label component
function MuscleLabel({ 
  text, 
  position, 
  visible 
}: { 
  text: string; 
  position: [number, number, number];
  visible: boolean;
}) {
  if (!visible) return null;
  
  return (
    <Billboard position={position} follow={true}>
      <Text
        fontSize={0.12}
        color="#1F2937"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#FFFFFF"
      >
        {text}
      </Text>
    </Billboard>
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
    <group position={[0, 0, 2.5]}>
      <mesh ref={meshRef}>
        <torusGeometry args={[0.4, 0.06, 8, 32]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      <Html center style={{ pointerEvents: "none" }}>
        <div className="text-amber-500 font-medium text-sm whitespace-nowrap">
          Analisando...
        </div>
      </Html>
    </group>
  );
}

// GLB Loading fallback
function GLBLoadingFallback() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial color="#F5E6D3" transparent opacity={0.5} wireframe />
      </mesh>
      <Html center>
        <div className="text-slate-600 text-sm animate-pulse">
          Carregando modelo 3D...
        </div>
      </Html>
    </group>
  );
}

// Scene content with model selection
function SceneContent({
  useGLBModel,
  layers,
  showLabels,
  showDangerZones,
  injectionPoints,
  isLoading,
  selectedPointId,
  onPointClick,
  onSurfaceClick,
  isEditMode
}: {
  useGLBModel: boolean;
  layers: LayerConfig;
  showLabels: boolean;
  showDangerZones: boolean;
  injectionPoints: InjectionPoint[];
  isLoading: boolean;
  selectedPointId: string | null;
  onPointClick: (point: InjectionPoint) => void;
  onSurfaceClick: (point: THREE.Vector3) => void;
  isEditMode: boolean;
}) {
  const [glbError, setGlbError] = useState(false);

  return (
    <>
      {/* Premium lighting setup */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={0.9} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2, 4]} intensity={0.5} />
      <directionalLight position={[0, -2, 3]} intensity={0.3} />
      <pointLight position={[-3, 0, -1]} intensity={0.4} color="#FFE4C4" />
      <pointLight position={[3, 0, -1]} intensity={0.4} color="#FFE4C4" />
      <spotLight position={[0, 5, 3]} intensity={0.6} angle={0.5} penumbra={0.5} color="#FFFFFF" />

      {/* Clickable surface for adding points */}
      <ClickableSurface onSurfaceClick={onSurfaceClick} isEditMode={isEditMode} />

      {/* Anatomical face model - GLB or Procedural */}
      {useGLBModel && !glbError ? (
        <Suspense fallback={<GLBLoadingFallback />}>
          <AnatomicalGLBModel layers={layers} />
        </Suspense>
      ) : (
        <AnatomicalFaceModelProcedural layers={layers} />
      )}

      {/* Danger zones */}
      {showDangerZones && DANGER_ZONES.map((zone) => (
        zone.positions.map((pos, idx) => (
          <DangerZoneMesh
            key={`${zone.id}-${idx}`}
            center={pos.center}
            radius={pos.radius}
            color={zone.color}
            label={zone.label}
            reason={zone.reason}
          />
        ))
      ))}

      {/* Muscle labels - only show for procedural model */}
      {showLabels && !useGLBModel && Object.entries(MUSCLE_DATA).map(([key, data]) => (
        <MuscleLabel 
          key={key}
          text={data.label}
          position={data.labelPosition}
          visible={layers.muscles.visible}
        />
      ))}

      {/* Injection points */}
      {injectionPoints.map((point) => (
        <InjectionPointMesh
          key={point.id}
          point={point}
          onClick={() => onPointClick(point)}
          isSelected={selectedPointId === point.id}
        />
      ))}

      {/* Loading indicator */}
      {isLoading && <LoadingIndicator />}

      {/* Controls */}
      <OrbitControls
        enablePan={true}
        panSpeed={0.5}
        minDistance={3}
        maxDistance={10}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI * 5 / 6}
        minAzimuthAngle={-Math.PI / 2}
        maxAzimuthAngle={Math.PI / 2}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
      />
    </>
  );
}

// Layer Control Panel Component
function LayerControlPanel({
  layers,
  onLayerChange,
  isEditMode,
  onEditModeChange,
  useGLBModel,
  onModelChange
}: {
  layers: LayerConfig;
  onLayerChange: (layers: LayerConfig) => void;
  isEditMode: boolean;
  onEditModeChange: (mode: boolean) => void;
  useGLBModel: boolean;
  onModelChange: (useGLB: boolean) => void;
}) {
  return (
    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-slate-200 w-[220px] space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <Layers className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-slate-700">Camadas</h4>
      </div>

      {/* Model Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="model-toggle" className="text-xs text-slate-600 flex items-center gap-1.5">
          <CircleDot className="w-3 h-3" />
          Modelo GLB
        </Label>
        <Switch
          id="model-toggle"
          checked={useGLBModel}
          onCheckedChange={onModelChange}
        />
      </div>

      {/* Skin Layer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="skin-toggle" className="text-xs text-slate-600 flex items-center gap-1.5">
            {layers.skin.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Pele
          </Label>
          <Switch
            id="skin-toggle"
            checked={layers.skin.visible}
            onCheckedChange={(checked) => onLayerChange({
              ...layers,
              skin: { ...layers.skin, visible: checked }
            })}
          />
        </div>
        {layers.skin.visible && (
          <Slider
            value={[layers.skin.opacity * 100]}
            onValueChange={([val]) => onLayerChange({
              ...layers,
              skin: { ...layers.skin, opacity: val / 100 }
            })}
            max={100}
            step={5}
            className="w-full"
          />
        )}
      </div>

      {/* Muscles Layer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="muscles-toggle" className="text-xs text-slate-600 flex items-center gap-1.5">
            {layers.muscles.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Músculos
          </Label>
          <Switch
            id="muscles-toggle"
            checked={layers.muscles.visible}
            onCheckedChange={(checked) => onLayerChange({
              ...layers,
              muscles: { ...layers.muscles, visible: checked }
            })}
          />
        </div>
        {layers.muscles.visible && (
          <Slider
            value={[layers.muscles.opacity * 100]}
            onValueChange={([val]) => onLayerChange({
              ...layers,
              muscles: { ...layers.muscles, opacity: val / 100 }
            })}
            max={100}
            step={5}
            className="w-full"
          />
        )}
      </div>

      {/* Bone Layer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="bone-toggle" className="text-xs text-slate-600 flex items-center gap-1.5">
            <Bone className="w-3 h-3" />
            Osso
          </Label>
          <Switch
            id="bone-toggle"
            checked={layers.bone.visible}
            onCheckedChange={(checked) => onLayerChange({
              ...layers,
              bone: { ...layers.bone, visible: checked }
            })}
          />
        </div>
        {layers.bone.visible && (
          <Slider
            value={[layers.bone.opacity * 100]}
            onValueChange={([val]) => onLayerChange({
              ...layers,
              bone: { ...layers.bone, opacity: val / 100 }
            })}
            max={100}
            step={5}
            className="w-full"
          />
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 pt-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="edit-mode" className="text-xs text-slate-600 flex items-center gap-1.5">
            <MousePointer className="w-3 h-3" />
            Modo Edição
          </Label>
          <Switch
            id="edit-mode"
            checked={isEditMode}
            onCheckedChange={onEditModeChange}
          />
        </div>
        {isEditMode && (
          <p className="text-[10px] text-amber-600 mt-1.5 bg-amber-50 rounded px-2 py-1">
            Clique no modelo para adicionar pontos
          </p>
        )}
      </div>
    </div>
  );
}

// Main component
export function Face3DViewer({ 
  injectionPoints, 
  onPointClick,
  onAddPoint,
  isLoading = false,
  showLabels = true,
  showMuscles = true,
  showDangerZones = true,
  safetyZones = [],
  useGLBModel: initialUseGLB = true,
  modelOpacity = 1.0,
  conversionFactor = 1.0,
  isEditMode: externalEditMode
}: Face3DViewerProps) {
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [internalEditMode, setInternalEditMode] = useState(false);
  const [useGLBModel, setUseGLBModel] = useState(initialUseGLB);
  
  const isEditMode = externalEditMode !== undefined ? externalEditMode : internalEditMode;

  const [layers, setLayers] = useState<LayerConfig>({
    skin: { visible: true, opacity: 0.3 },
    muscles: { visible: showMuscles, opacity: modelOpacity },
    bone: { visible: false, opacity: 0.5 }
  });

  // Sync external props with internal state
  useEffect(() => {
    setLayers(prev => ({
      ...prev,
      muscles: { ...prev.muscles, visible: showMuscles, opacity: modelOpacity }
    }));
  }, [showMuscles, modelOpacity]);

  const handlePointClick = (point: InjectionPoint) => {
    setSelectedPointId(point.id);
    onPointClick?.(point);
  };

  const handleSurfaceClick = useCallback((point3D: THREE.Vector3) => {
    if (!isEditMode || !onAddPoint) return;
    
    const { x, y } = threeDToPercent(point3D.x, point3D.y);
    const muscle = detectMuscleFromPosition(point3D.x, point3D.y);
    
    const newPoint: Omit<InjectionPoint, 'id'> = {
      muscle,
      x,
      y,
      depth: "superficial",
      dosage: Math.round(4 * conversionFactor),
      notes: "Ponto adicionado manualmente"
    };
    
    onAddPoint(newPoint);
  }, [isEditMode, onAddPoint, conversionFactor]);

  return (
    <div className="w-full h-full min-h-[500px] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 rounded-xl overflow-hidden relative">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <SceneContent
            useGLBModel={useGLBModel}
            layers={layers}
            showLabels={showLabels}
            showDangerZones={showDangerZones}
            injectionPoints={injectionPoints}
            isLoading={isLoading}
            selectedPointId={selectedPointId}
            onPointClick={handlePointClick}
            onSurfaceClick={handleSurfaceClick}
            isEditMode={isEditMode}
          />
        </Suspense>
      </Canvas>

      {/* Layer Control Panel */}
      <LayerControlPanel
        layers={layers}
        onLayerChange={setLayers}
        isEditMode={internalEditMode}
        onEditModeChange={setInternalEditMode}
        useGLBModel={useGLBModel}
        onModelChange={setUseGLBModel}
      />

      {/* Danger zones panel */}
      {showDangerZones && (
        <div className="absolute top-4 right-4 bg-red-50/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-red-200 max-w-[200px]">
          <h4 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
            ⚠️ Zonas de Segurança
          </h4>
          <div className="space-y-1">
            {DANGER_ZONES.slice(0, 3).map((zone) => (
              <div key={zone.id} className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: zone.color }}
                ></div>
                <span className="text-xs text-red-600">{zone.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit mode indicator */}
      {isEditMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            <Plus className="w-4 h-4" />
            Clique para adicionar ponto
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-20 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-slate-200">
        <h4 className="text-xs font-semibold text-slate-700 mb-2">Legenda</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600 ring-2 ring-white shadow"></div>
            <span className="text-xs text-slate-600">Ponto de Aplicação</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-slate-600">Superficial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500"></div>
            <span className="text-xs text-slate-600">Profundo</span>
          </div>
          {showDangerZones && (
            <>
              <div className="border-t border-slate-200 my-2"></div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50 border border-red-500"></div>
                <span className="text-xs text-slate-600">Zona de Perigo</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-slate-200">
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              Arraste para rotacionar
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              Scroll para zoom
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Clique nos pontos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
