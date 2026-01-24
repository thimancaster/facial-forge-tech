import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eye, EyeOff, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviousPhotoOverlayProps {
  previousPhotoUrl: string | null;
  containerWidth: number;
  containerHeight: number;
  isMirrored?: boolean;
}

export function PreviousPhotoOverlay({
  previousPhotoUrl,
  containerWidth,
  containerHeight,
  isMirrored = true,
}: PreviousPhotoOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [opacity, setOpacity] = useState(30);

  if (!previousPhotoUrl) return null;

  return (
    <>
      {/* Overlay image */}
      {isVisible && (
        <div 
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            opacity: opacity / 100,
          }}
        >
          <img
            src={previousPhotoUrl}
            alt="Foto anterior para referência"
            className="w-full h-full object-cover"
            style={{
              transform: isMirrored ? 'scaleX(-1)' : 'none',
              filter: 'saturate(0.5) contrast(1.1)',
              mixBlendMode: 'difference',
            }}
          />
          {/* Border to indicate overlay is active */}
          <div className="absolute inset-0 border-2 border-purple-500/50 rounded-lg pointer-events-none" />
        </div>
      )}

      {/* Control panel */}
      <div className="absolute top-32 right-2 z-30">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 space-y-2">
          {/* Toggle button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-9 h-9",
              isVisible 
                ? "text-purple-400 bg-purple-500/20 hover:bg-purple-500/30" 
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
            onClick={() => setIsVisible(!isVisible)}
            title={isVisible ? "Ocultar foto anterior" : "Mostrar foto anterior"}
          >
            {isVisible ? (
              <Layers className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>

          {/* Opacity slider (only visible when overlay is active) */}
          {isVisible && (
            <div className="w-9 h-24 flex flex-col items-center gap-1">
              <span className="text-white/60 text-[9px]">{opacity}%</span>
              <Slider
                value={[opacity]}
                onValueChange={([value]) => setOpacity(value)}
                min={10}
                max={70}
                step={5}
                orientation="vertical"
                className="h-16"
              />
              <EyeOff className="w-3 h-3 text-white/40" />
            </div>
          )}
        </div>
      </div>

      {/* Label when visible */}
      {isVisible && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-purple-500/80 text-white text-xs px-3 py-1 rounded-full font-medium">
            Comparando com foto anterior
          </div>
        </div>
      )}
    </>
  );
}
