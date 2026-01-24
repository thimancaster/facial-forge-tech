import { useEffect, useState, useCallback } from 'react';

export interface DeviceOrientation {
  alpha: number | null; // Rotation around Z-axis (compass direction)
  beta: number | null;  // Rotation around X-axis (front-back tilt)
  gamma: number | null; // Rotation around Y-axis (left-right tilt)
  absolute: boolean;
}

export interface ProfileAngleResult {
  isCorrectAngle: boolean;
  currentAngle: number;
  targetAngle: number;
  deviation: number;
  direction: 'left' | 'right' | 'correct';
  message: string;
}

interface UseDeviceOrientationOptions {
  targetAngle?: number; // Target angle for profile (90 for left, -90 for right)
  tolerance?: number;   // Acceptable deviation in degrees
  onAngleChange?: (result: ProfileAngleResult) => void;
}

export function useDeviceOrientation(options: UseDeviceOrientationOptions = {}) {
  const { targetAngle = 90, tolerance = 15, onAngleChange } = options;
  
  const [orientation, setOrientation] = useState<DeviceOrientation>({
    alpha: null,
    beta: null,
    gamma: null,
    absolute: false,
  });
  
  const [isSupported, setIsSupported] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [profileResult, setProfileResult] = useState<ProfileAngleResult>({
    isCorrectAngle: false,
    currentAngle: 0,
    targetAngle,
    deviation: 90,
    direction: 'correct',
    message: 'Aguardando orientação...',
  });

  // Check for DeviceOrientationEvent support
  useEffect(() => {
    const supported = 'DeviceOrientationEvent' in window;
    setIsSupported(supported);
    
    // Check if we need to request permission (iOS 13+)
    if (supported && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      // iOS 13+ requires permission request
      setPermissionGranted(false);
    } else if (supported) {
      // Non-iOS or older iOS - permission not needed
      setPermissionGranted(true);
    }
  }, []);

  // Request permission for iOS 13+
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        const granted = permission === 'granted';
        setPermissionGranted(granted);
        return granted;
      } catch (error) {
        console.warn('Device orientation permission denied:', error);
        setPermissionGranted(false);
        return false;
      }
    }
    return true;
  }, []);

  // Handle orientation events
  useEffect(() => {
    if (!isSupported || !permissionGranted) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const newOrientation: DeviceOrientation = {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        absolute: event.absolute,
      };
      
      setOrientation(newOrientation);
      
      // Calculate profile angle result using gamma (left-right tilt)
      if (event.gamma !== null) {
        const currentAngle = event.gamma;
        const deviation = Math.abs(Math.abs(currentAngle) - Math.abs(targetAngle));
        const isCorrectAngle = deviation <= tolerance;
        
        let direction: 'left' | 'right' | 'correct' = 'correct';
        let message = 'Ângulo perfeito! ✓';
        
        if (!isCorrectAngle) {
          if (targetAngle > 0) {
            // Looking for left profile (positive gamma)
            if (currentAngle < targetAngle - tolerance) {
              direction = 'left';
              message = `Vire mais para a esquerda (${Math.round(deviation)}°)`;
            } else if (currentAngle > targetAngle + tolerance) {
              direction = 'right';
              message = `Vire menos (${Math.round(deviation)}°)`;
            }
          } else {
            // Looking for right profile (negative gamma)
            if (currentAngle > targetAngle + tolerance) {
              direction = 'right';
              message = `Vire mais para a direita (${Math.round(deviation)}°)`;
            } else if (currentAngle < targetAngle - tolerance) {
              direction = 'left';
              message = `Vire menos (${Math.round(deviation)}°)`;
            }
          }
        }
        
        const result: ProfileAngleResult = {
          isCorrectAngle,
          currentAngle,
          targetAngle,
          deviation,
          direction,
          message,
        };
        
        setProfileResult(result);
        onAngleChange?.(result);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isSupported, permissionGranted, targetAngle, tolerance, onAngleChange]);

  return {
    orientation,
    profileResult,
    isSupported,
    permissionGranted,
    requestPermission,
  };
}

// Hook specifically for profile photo angle detection
export function useProfileAngleDetection(
  photoType: 'profile_left' | 'profile_right' | null,
  options: { tolerance?: number } = {}
) {
  const { tolerance = 15 } = options;
  
  // Determine target angle based on profile direction
  const targetAngle = photoType === 'profile_left' ? 70 : photoType === 'profile_right' ? -70 : 0;
  
  const {
    orientation,
    profileResult,
    isSupported,
    permissionGranted,
    requestPermission,
  } = useDeviceOrientation({
    targetAngle,
    tolerance,
  });

  // Only active for profile photos
  const isActive = photoType === 'profile_left' || photoType === 'profile_right';

  return {
    isActive,
    isSupported,
    permissionGranted,
    requestPermission,
    orientation,
    result: isActive ? profileResult : null,
    targetAngle,
  };
}
