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
  frontalis_left: "Frontal Esq.",
  frontalis_right: "Frontal Dir.",
  frontalis_center: "Frontal Centro",
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
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.1;

  // Update container dimensions on resize
  useEffect(() => {
    const updateContainerDimensions = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateContainerDimensions();
    window.addEventListener("resize", updateContainerDimensions);
    return () => window.removeEventListener("resize", updateContainerDimensions);
  }, []);

  // Handle image load to get natural dimensions
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
    }
  }, []);

  // Calculate the actual rendered size of the image (object-contain)
  const getRenderedImageSize = useCallback(() => {
    if (!imageDimensions.width || !imageDimensions.height || !containerDimensions.width || !containerDimensions.height) {
      return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
    }

    const imageAspect = imageDimensions.width / imageDimensions.height;
    const containerAspect = containerDimensions.width / containerDimensions.height;

    let renderedWidth: number;
    let renderedHeight: number;

    if (imageAspect > containerAspect) {
      // Image is wider than container - fit to width
      renderedWidth = containerDimensions.width;
      renderedHeight = containerDimensions.width / imageAspect;
    } else {
      // Image is taller than container - fit to height
      renderedHeight = containerDimensions.height;
      renderedWidth = containerDimensions.height * imageAspect;
    }

    // Calculate offset to center the image
    const offsetX = (containerDimensions.width - renderedWidth) / 2;
    const offsetY = (containerDimensions.height - renderedHeight) / 2;

    return { width: renderedWidth, height: renderedHeight, offsetX, offsetY };
  }, [imageDimensions, containerDimensions]);

  // Convert point percentage to pixel position on the rendered image
  const getPointPosition = useCallback(
    (point: InjectionPoint) => {
      const { width, height, offsetX, offsetY } = getRenderedImageSize();
      if (!width || !height) return { x: 0, y: 0 };

      // point.x and point.y are percentages (0-100)
      const x = offsetX + (point.x / 100) * width;
      const y = offsetY + (point.y / 100) * height;

      return { x, y };
    },
    [getRenderedImageSize]
  );

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

  // Base radius that scales inversely with zoom to maintain visual size
  const baseRadius = 14;
  const scaledRadius = baseRadius / zoom;

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
          className="relative w-full h-full transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          {/* Photo */}
          <img
            ref={imageRef}
            src={photoUrl}
            alt="Foto do paciente em repouso"
            className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
            draggable={false}
            onLoad={handleImageLoad}
          />

          {/* SVG Overlay for Injection Points - positioned exactly over the image */}
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ overflow: "visible" }}
          >
            {injectionPoints.map((point) => {
              const confidence = point.confidence ?? 0.85;
              const confidenceColor = getConfidenceColor(confidence);
              const isSelected = selectedPointId === point.id;
              const isHovered = hoveredPoint === point.id;
              const muscleLabel = MUSCLE_LABELS[point.muscle] || point.muscle;

              // Get pixel position
              const { x, y } = getPointPosition(point);
              if (x === 0 && y === 0) return null;

              const haloRadius = scaledRadius * 2.5;

              return (
                <g key={point.id}>
                  {/* Diffusion halo */}
                  <circle
                    cx={x}
                    cy={y}
                    r={haloRadius}
                    fill={point.depth === "deep" ? "#7C3AED" : "#10B981"}
                    opacity={0.25}
                    className="transition-opacity"
                  />

                  {/* Confidence ring */}
                  <circle
                    cx={x}
                    cy={y}
                    r={scaledRadius * 1.5}
                    fill="none"
                    stroke={confidenceColor}
                    strokeWidth={2.5 / zoom}
                    opacity={0.9}
                  />

                  {/* Outer white ring */}
                  <circle
                    cx={x}
                    cy={y}
                    r={scaledRadius * 1.2}
                    fill="none"
                    stroke="white"
                    strokeWidth={2 / zoom}
                    opacity={isSelected || isHovered ? 1 : 0.8}
                  />

                  {/* Main point - clickable */}
                  <circle
                    cx={x}
                    cy={y}
                    r={scaledRadius}
                    fill="#DC2626"
                    stroke={isSelected ? "#FFD700" : "white"}
                    strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                    className="cursor-pointer transition-all"
                    style={{ pointerEvents: "auto" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPointClick?.(point);
                    }}
                    onMouseEnter={() => setHoveredPoint(point.id)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />

                  {/* Depth indicator (inner circle) */}
                  <circle
                    cx={x}
                    cy={y}
                    r={scaledRadius * 0.5}
                    fill={point.depth === "deep" ? "#7C3AED" : "#10B981"}
                    style={{ pointerEvents: "none" }}
                  />

                  {/* Dosage label - positioned above the point */}
                  <text
                    x={x}
                    y={y - scaledRadius * 1.8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={12 / zoom}
                    fontWeight="bold"
                    style={{
                      textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.5)",
                      pointerEvents: "none",
                    }}
                  >
                    {point.dosage}U
                  </text>

                  {/* Tooltip on hover */}
                  {isHovered && (
                    <g style={{ pointerEvents: "none" }}>
                      <foreignObject
                        x={x + scaledRadius * 2}
                        y={y - 50 / zoom}
                        width={180 / zoom}
                        height={90 / zoom}
                        style={{ overflow: "visible" }}
                      >
                        <div
                          className="bg-slate-900/95 backdrop-blur-sm border border-amber-500/30 rounded-lg px-3 py-2 shadow-2xl whitespace-nowrap"
                          style={{ 
                            fontSize: `${11 / zoom}px`,
                            transform: `scale(${1 / zoom})`,
                            transformOrigin: "top left"
                          }}
                        >
                          <p className="font-bold text-amber-400">{muscleLabel}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-white font-semibold">
                              {point.dosage}U
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                point.depth === "deep"
                                  ? "bg-violet-500/20 text-violet-300"
                                  : "bg-emerald-500/20 text-emerald-300"
                              }`}
                            >
                              {point.depth === "deep" ? "Profundo" : "Superficial"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-slate-400 text-xs">
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
                    </g>
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
