import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, X, SwitchCamera, Loader2, Info, Layers } from "lucide-react";
import { useMediaPipeFaceMesh, EnhancedFaceQuality } from "@/hooks/useMediaPipeFaceMesh";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { useProfileAngleDetection } from "@/hooks/useDeviceOrientation";
import { useImageSharpness } from "@/hooks/useImageSharpness";
import { FaceFramingOverlay } from "@/components/camera/FaceFramingOverlay";
import { DynamicFaceMeshOverlay } from "@/components/camera/DynamicFaceMeshOverlay";
import { ProfileAngleGuide } from "@/components/camera/ProfileAngleGuide";
import { PreviousPhotoOverlay } from "@/components/camera/PreviousPhotoOverlay";
import { EnhancedQualityIndicator, EnhancedQualityIndicatorCompact } from "@/components/camera/EnhancedQualityIndicator";
import { QualityIndicator, QualityIndicatorCompact } from "@/components/camera/QualityIndicator";
import { cn } from "@/lib/utils";

export type PhotoType = 
  | "resting" 
  | "glabellar" 
  | "frontal" 
  | "smile" 
  | "nasal" 
  | "perioral" 
  | "profile_left" 
  | "profile_right";

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  photoLabel: string;
  photoType: PhotoType;
  previousPhotoUrl?: string | null;
}

const PHOTO_GUIDES: Record<PhotoType, { title: string; instruction: string; tip: string }> = {
  resting: {
    title: "Face em Repouso",
    instruction: "Mantenha expressão neutra, olhe diretamente para a câmera",
    tip: "Relaxe os músculos faciais completamente",
  },
  glabellar: {
    title: "Contração Glabelar",
    instruction: "Faça expressão de 'Bravo' — franza a testa entre as sobrancelhas",
    tip: "Force a contração máxima do corrugador",
  },
  frontal: {
    title: "Contração Frontal",
    instruction: "Faça expressão de 'Surpresa' — levante as sobrancelhas bem alto",
    tip: "Mantenha 2cm acima das sobrancelhas visível",
  },
  smile: {
    title: "Sorriso Forçado",
    instruction: "Sorria intensamente, mostrando os dentes — ativa pés de galinha",
    tip: "Mantenha os olhos abertos para evidenciar rugas",
  },
  nasal: {
    title: "Contração Nasal",
    instruction: "Franza o nariz como se sentisse cheiro ruim — 'Bunny Lines'",
    tip: "Concentre-se nas linhas laterais do nariz",
  },
  perioral: {
    title: "Contração Perioral",
    instruction: "Franza os lábios como se fosse dar um beijo — 'Código de Barras'",
    tip: "Maximize a contração do orbicular dos lábios",
  },
  profile_left: {
    title: "Perfil Esquerdo",
    instruction: "Vire o rosto para a direita — mostre o lado esquerdo do rosto",
    tip: "Mantenha o queixo paralelo ao chão",
  },
  profile_right: {
    title: "Perfil Direito",
    instruction: "Vire o rosto para a esquerda — mostre o lado direito do rosto",
    tip: "Mantenha o queixo paralelo ao chão",
  },
};

export function CameraCapture({ 
  isOpen, 
  onClose, 
  onCapture, 
  photoLabel, 
  photoType,
  previousPhotoUrl = null,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({ width: 400, height: 533 });
  const [captureEnabled, setCaptureEnabled] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [useEnhancedDetection, setUseEnhancedDetection] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(false);

  const guide = PHOTO_GUIDES[photoType];
  const isProfile = photoType === 'profile_left' || photoType === 'profile_right';

  // MediaPipe Face Mesh (enhanced detection with 468 landmarks)
  const mediaPipe = useMediaPipeFaceMesh(videoRef, {
    detectionInterval: 100,
    enableSharpnessCheck: true,
  });

  // Fallback basic detection
  const basicDetection = useFaceDetection(videoRef, { detectionInterval: 200 });

  // Profile angle detection via gyroscope
  const profileAngle = useProfileAngleDetection(
    isProfile ? photoType : null,
    { tolerance: 15 }
  );

  // Image sharpness analysis
  const { analyzeVideoFrame } = useImageSharpness({ sharpnessThreshold: 40 });

  // Determine which detection to use
  const useMediaPipe = useEnhancedDetection && mediaPipe.isReady;
  const currentQuality: EnhancedFaceQuality = useMediaPipe 
    ? mediaPipe.quality 
    : {
        ...basicDetection.quality,
        isSharp: true,
        isSymmetric: true,
        hasCorrectExpression: true,
        faceCenterOffset: { x: 0, y: 0 },
        faceRotation: { pitch: 0, yaw: 0, roll: 0 },
        faceSizeRatio: 0,
        symmetryScore: 100,
        sharpnessScore: 100,
        brightnessLevel: 128,
      };

  // Update capture state based on quality
  useEffect(() => {
    const canCapture = currentQuality.overallScore >= 50;
    setCaptureEnabled(canCapture);

    // Auto-capture when quality is excellent
    if (autoCapture && currentQuality.overallScore >= 75 && countdown === null) {
      // For profiles, also check gyroscope angle
      if (isProfile && profileAngle.result && !profileAngle.result.isCorrectAngle) {
        return;
      }
      startCountdown();
    }
  }, [currentQuality.overallScore, autoCapture, countdown, isProfile, profileAngle.result]);

  const startCountdown = useCallback(() => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (prev === 1) {
            handleCapture();
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Update container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isOpen]);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Request gyroscope permission for profiles on iOS
      if (isProfile && profileAngle.isSupported && !profileAngle.permissionGranted) {
        profileAngle.requestPermission();
      }
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error("Camera error:", err);
      }
      if (err.name === "NotAllowedError") {
        setError("Permissão de câmera negada. Por favor, permita o acesso à câmera.");
      } else if (err.name === "NotFoundError") {
        setError("Nenhuma câmera encontrada no dispositivo.");
      } else {
        setError("Erro ao acessar a câmera. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stream, isProfile, profileAngle]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror the image if using front camera
    if (facingMode === "user") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${photoType}-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        handleClose();
      }
    }, "image/jpeg", 0.9);
  }, [facingMode, photoType, onCapture]);

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCountdown(null);
    onClose();
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-black border-none">
        <div ref={containerRef} className="relative aspect-[3/4] w-full">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="text-white font-medium text-sm block">{photoLabel}</span>
                <span className="text-white/70 text-xs">{guide.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Toggle landmarks visibility */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-8 h-8",
                    showLandmarks ? "text-purple-400 bg-purple-500/20" : "text-white/70 hover:text-white hover:bg-white/20"
                  )}
                  onClick={() => setShowLandmarks(!showLandmarks)}
                  title="Mostrar landmarks"
                >
                  <Layers className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/20 w-8 h-8"
                  onClick={() => setShowTip(!showTip)}
                >
                  <Info className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleClose}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Tip panel */}
            {showTip && (
              <div className="mt-2 p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <p className="text-blue-200 text-xs">💡 {guide.tip}</p>
              </div>
            )}
          </div>

          {/* Camera View */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 p-6 text-center">
              <Camera className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-white mb-4">{error}</p>
              <Button variant="secondary" onClick={startCamera}>
                Tentar novamente
              </Button>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setIsLoading(false)}
            className="w-full h-full object-cover"
            style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
          />

          {/* Previous photo overlay for comparison */}
          <PreviousPhotoOverlay
            previousPhotoUrl={previousPhotoUrl}
            containerWidth={containerDimensions.width}
            containerHeight={containerDimensions.height}
            isMirrored={facingMode === "user"}
          />

          {/* Flash effect overlay */}
          {flashActive && (
            <div className="absolute inset-0 bg-white z-30 animate-fade-out" />
          )}

          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center z-25 bg-black/30">
              <span className="text-8xl font-bold text-white animate-pulse">
                {countdown}
              </span>
            </div>
          )}

          {/* Dynamic face mesh overlay (MediaPipe landmarks) */}
          {!isLoading && !error && useMediaPipe && mediaPipe.result && (
            <DynamicFaceMeshOverlay
              photoType={photoType}
              faceMesh={mediaPipe.result}
              containerWidth={containerDimensions.width}
              containerHeight={containerDimensions.height}
              qualityScore={currentQuality.overallScore}
              showLandmarks={showLandmarks}
              showConnections={showLandmarks}
              isMirrored={facingMode === "user"}
            />
          )}

          {/* Fallback static framing overlay */}
          {!isLoading && !error && (!useMediaPipe || !mediaPipe.result) && (
            <FaceFramingOverlay
              photoType={photoType}
              quality={basicDetection.quality}
              landmarks={basicDetection.landmarks}
              containerWidth={containerDimensions.width}
              containerHeight={containerDimensions.height}
            />
          )}

          {/* Profile angle guide (gyroscope) */}
          {isProfile && (
            <ProfileAngleGuide
              profileType={photoType as 'profile_left' | 'profile_right'}
              angleResult={profileAngle.result}
              isSupported={profileAngle.isSupported}
              containerWidth={containerDimensions.width}
              containerHeight={containerDimensions.height}
            />
          )}

          {/* Quality indicator - compact version at top */}
          {!isLoading && !error && (
            <div className="absolute top-20 left-0 right-0 z-20 flex justify-center px-4">
              {useMediaPipe ? (
                <EnhancedQualityIndicatorCompact quality={currentQuality} />
              ) : (
                <QualityIndicatorCompact quality={basicDetection.quality} />
              )}
            </div>
          )}

          {/* Instruction panel */}
          <div className="absolute bottom-32 left-0 right-0 z-20 text-center px-4">
            <p className="text-white/90 text-sm font-medium bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
              {guide.instruction}
            </p>
          </div>

          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
            {/* Quality indicator - full version */}
            <div className="mb-4">
              {useMediaPipe ? (
                <EnhancedQualityIndicator quality={currentQuality} showDetails showSharpness />
              ) : (
                <QualityIndicator quality={basicDetection.quality} showDetails />
              )}
            </div>

            <div className="flex items-center justify-center gap-6">
              {/* Switch camera button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 w-12 h-12"
                onClick={toggleCamera}
                disabled={isLoading || !!error}
              >
                <SwitchCamera className="w-6 h-6" />
              </Button>

              {/* Capture button */}
              <button
                onClick={handleCapture}
                disabled={isLoading || !!error || countdown !== null}
                className={cn(
                  "w-16 h-16 rounded-full border-4 transition-all duration-300",
                  captureEnabled
                    ? "bg-white border-green-400 hover:scale-105 active:scale-95"
                    : "bg-white/50 border-white/30 cursor-not-allowed"
                )}
                aria-label="Capturar foto"
              >
                <div className={cn(
                  "w-full h-full rounded-full transition-colors",
                  captureEnabled && "animate-pulse"
                )} />
              </button>

              {/* Auto-capture toggle */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "w-12 h-12",
                  autoCapture 
                    ? "text-green-400 hover:bg-green-500/20" 
                    : "text-white/50 hover:bg-white/20"
                )}
                onClick={() => setAutoCapture(!autoCapture)}
                disabled={isLoading || !!error}
                title={autoCapture ? "Auto-captura ativada" : "Ativar auto-captura"}
              >
                <Camera className="w-6 h-6" />
                {autoCapture && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                )}
              </Button>
            </div>

            {/* Help text */}
            <p className="text-center text-white/50 text-xs mt-3">
              {captureEnabled 
                ? "Posição ideal — pode capturar!" 
                : "Ajuste a posição para liberar captura"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
