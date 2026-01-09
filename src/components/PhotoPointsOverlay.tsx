import { useState, useRef, useCallback, useEffect, WheelEvent } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InjectionPoint } from "./Face3DViewer";

interface PhotoPointsOverlayProps {
  photoUrl: string;
  injectionPoints: InjectionPoint[];
  onPointClick?: (point: InjectionPoint) => void;
  selectedPointId?: string | null;
}

// Get confidence color based on score
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "#10B981"; // Green
  if (confidence >= 0.5) return "#F59E0B"; // Yellow
  return "#EF4444"; // Red
}

// Get muscle display label
const MUSCLE_LABELS: Record<string, string> = {
  procerus: "Prócero",
  corrugator_left: "Corrugador Esq.",
  corrugator_right: "Corrugador Dir.",
  frontalis: "Frontal",
  orbicularis_oculi_left: "Orbicular Olho Esq.",
  orbicularis_oculi_right: "Orbicular Olho Dir.",
  nasalis: "Nasal",
  levator_labii: "Levantador Lábio",
  orbicularis_oris: "Orbicular Boca",
  mentalis: "Mentual",
  masseter: "Masseter",
};

export function PhotoPointsOverlay({
  photoUrl,
  injectionPoints,
  onPointClick,
  selectedPointId,
}: PhotoPointsOverlayProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.1;

  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)));
  }, []);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + 0.25));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(MIN_ZOOM, prev - 0.25));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-slate-200">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="h-8 w-8"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="text-center text-xs font-medium text-slate-600">
          {Math.round(zoom * 100)}%
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="h-8 w-8"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="border-t border-slate-200 pt-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-8 w-8"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-slate-200">
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span>🖱️ Scroll para zoom</span>
          <span>✋ Arraste para mover</span>
          <span>👆 Clique nos pontos</span>
        </div>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="relative w-full h-full flex items-center justify-center transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          {/* Photo */}
          <img
            src={photoUrl}
            alt="Foto do paciente em repouso"
            className="max-w-full max-h-full object-contain select-none pointer-events-none"
            draggable={false}
          />

          {/* SVG Overlay for Injection Points */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ overflow: "visible" }}
          >
            {injectionPoints.map((point) => {
              const confidence = point.confidence ?? 0.85;
              const confidenceColor = getConfidenceColor(confidence);
              const isSelected = selectedPointId === point.id;
              const isHovered = hoveredPoint === point.id;
              const muscleLabel = MUSCLE_LABELS[point.muscle] || point.muscle;

              // Convert percentage to SVG coordinates
              const cx = `${point.x}%`;
              const cy = `${point.y}%`;

              // Base size that scales with zoom
              const baseRadius = 12 / zoom;
              const haloRadius = baseRadius * 2.5;

              return (
                <g key={point.id} style={{ pointerEvents: "auto" }}>
                  {/* Diffusion halo */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={haloRadius}
                    fill={point.depth === "deep" ? "#7C3AED" : "#10B981"}
                    opacity={0.2}
                    className="transition-opacity"
                  />

                  {/* Confidence ring */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={baseRadius * 1.4}
                    fill="none"
                    stroke={confidenceColor}
                    strokeWidth={2 / zoom}
                    opacity={0.8}
                  />

                  {/* Outer white ring */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={baseRadius * 1.15}
                    fill="none"
                    stroke="white"
                    strokeWidth={2 / zoom}
                    opacity={isSelected || isHovered ? 1 : 0.7}
                  />

                  {/* Main point */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={baseRadius}
                    fill="#DC2626"
                    stroke={isSelected ? "#FFD700" : "white"}
                    strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                    className="cursor-pointer transition-all hover:fill-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPointClick?.(point);
                    }}
                    onMouseEnter={() => setHoveredPoint(point.id)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />

                  {/* Depth indicator */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={baseRadius * 0.5}
                    fill={point.depth === "deep" ? "#7C3AED" : "#10B981"}
                  />

                  {/* Dosage label */}
                  <text
                    x={cx}
                    y={`calc(${point.y}% - ${baseRadius * 1.8}px)`}
                    textAnchor="middle"
                    fill="white"
                    fontSize={11 / zoom}
                    fontWeight="bold"
                    style={{
                      textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                      pointerEvents: "none",
                    }}
                  >
                    {point.dosage}U
                  </text>

                  {/* Tooltip on hover */}
                  {isHovered && (
                    <foreignObject
                      x={`calc(${point.x}% + ${baseRadius * 2}px)`}
                      y={`calc(${point.y}% - 40px)`}
                      width={200 / zoom}
                      height={100 / zoom}
                      style={{ overflow: "visible" }}
                    >
                      <div
                        className="bg-slate-900/95 backdrop-blur-sm border border-amber-500/30 rounded-lg px-3 py-2 shadow-2xl whitespace-nowrap"
                        style={{ fontSize: `${11 / zoom}px` }}
                      >
                        <p className="font-bold text-amber-400">{muscleLabel}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-white font-semibold">
                            {point.dosage}U
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full ${
                              point.depth === "deep"
                                ? "bg-violet-500/20 text-violet-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {point.depth === "deep" ? "Profundo" : "Superficial"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-slate-400">
                          <span>Confiança:</span>
                          <span
                            className="font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${confidenceColor}20`,
                              color: confidenceColor,
                            }}
                          >
                            {Math.round(confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-20 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-slate-200">
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
        </div>
      </div>
    </div>
  );
}
