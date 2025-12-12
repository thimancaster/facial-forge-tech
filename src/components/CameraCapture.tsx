import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, X, SwitchCamera, Loader2 } from "lucide-react";

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  photoLabel: string;
}

export function CameraCapture({ isOpen, onClose, onCapture, photoLabel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Stop existing stream
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
    } catch (err: any) {
      console.error("Camera error:", err);
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
  }, [facingMode, stream]);

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

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Flash effect
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${photoLabel.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        handleClose();
      }
    }, "image/jpeg", 0.9);
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    onClose();
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-black border-none">
        <div className="relative aspect-[3/4] w-full">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium text-sm">{photoLabel}</span>
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

          {/* Flash effect overlay */}
          {flashActive && (
            <div className="absolute inset-0 bg-white z-30 animate-fade-out" />
          )}

          {/* Face guide overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-64 border-2 border-white/40 rounded-[50%] border-dashed" />
          </div>

          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/60 to-transparent">
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
                disabled={isLoading || !!error}
                className="w-16 h-16 rounded-full bg-white border-4 border-white/30 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                aria-label="Capturar foto"
              />

              {/* Spacer for alignment */}
              <div className="w-12 h-12" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
