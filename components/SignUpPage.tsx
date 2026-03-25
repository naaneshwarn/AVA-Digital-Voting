import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Page, UserData } from '../types.ts';
import Button from './Button.tsx';
import TriColorBorderBox from './TriColorBorderBox.tsx';
import CameraIcon from './icons/CameraIcon.tsx';
import InputField from './InputField.tsx';
import { validateAadhar, validateVoterId } from '../utils/validation.ts';
import { backendService } from '../services/backendService.ts';

interface SignUpPageProps {
  setCurrentPage: (page: Page) => void;
}

const SignUpPage: React.FC<SignUpPageProps> = ({ setCurrentPage }) => {
  const [formState, setFormState] = useState({ name: '', aadhar: '', voterId: '' });
  const [errors, setErrors] = useState({ name: '', aadhar: '', voterId: '', photo: '', api: '' });
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const videoElement = videoRef.current;

    if (isCameraActive) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
          stream = s;
          if (videoElement) {
            videoElement.srcObject = stream;
          }
          setCameraError(null);
        })
        .catch(err => {
          console.error("Error accessing camera:", err);
          setCameraError("Camera access was denied. Please enable it in your browser settings.");
          setIsCameraActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [isCameraActive]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === 'voterId') {
      processedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    }
    if (name === 'aadhar') {
      processedValue = value.replace(/\D/g, '').slice(0, 12);
    }
    
    setFormState(prev => ({ ...prev, [name]: processedValue }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({...prev, [name]: ''}));
    }
    if (errors.api) {
      setErrors(prev => ({...prev, api: ''}));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let error = '';
    switch (name) {
      case 'name':
        if (!value.trim()) error = 'Full name is required.';
        break;
      case 'aadhar':
        const aadharValidation = validateAadhar(value);
        if (!aadharValidation.isValid) error = aadharValidation.message;
        break;
      case 'voterId':
        const voterIdValidation = validateVoterId(value);
        if (!voterIdValidation.isValid) error = voterIdValidation.message;
        break;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhotoData(dataUrl);
        setIsCameraActive(false); // Turn off camera
        setErrors(prev => ({...prev, photo: ''}));
        setCountdown(null);
      }
    }
  }, []);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      handleCapture();
      return;
    }

    const timerId = setTimeout(() => {
      setCountdown(c => (c ? c - 1 : null));
    }, 1000);

    return () => clearTimeout(timerId);
  }, [countdown, handleCapture]);


  const handleStartCapture = () => {
    if (countdown === null) {
      setCountdown(3);
    }
  };

  const handleRetake = () => {
    setPhotoData(null);
    setIsCameraActive(true);
    setCountdown(null);
  };
  
  const handleStartCamera = () => {
    setCameraError(null);
    setIsCameraActive(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors(prev => ({ ...prev, api: '' }));

    const aadharValidation = validateAadhar(formState.aadhar);
    const voterIdValidation = validateVoterId(formState.voterId);
    const isNameValid = formState.name.trim() !== '';
    const isPhotoTaken = !!photoData;

    const hasErrors = !isNameValid || !aadharValidation.isValid || !voterIdValidation.isValid || !isPhotoTaken;

    if (hasErrors) {
       setErrors({
         name: isNameValid ? '' : 'Full name is required.',
         aadhar: aadharValidation.isValid ? '' : aadharValidation.message,
         voterId: voterIdValidation.isValid ? '' : voterIdValidation.message,
         photo: isPhotoTaken ? '' : 'Please capture your photo.',
         api: '',
       });
       return;
    }
    
    setIsSubmitting(true);
    const newUser: UserData = { ...formState, photo: photoData ?? undefined };
    const registrationResult = await backendService.registerUser(newUser);

    if (registrationResult.success) {
      alert(registrationResult.message);
      setCurrentPage(Page.LOGIN);
    } else {
      setErrors(prev => ({ ...prev, api: registrationResult.message }));
    }
    setIsSubmitting(false);
  };

  const getHelperText = () => {
    if (cameraError) return '';
    if (isCameraActive) return 'Position your face in the center and click capture.';
    if (photoData) return 'Photo captured successfully.';
    return 'Click "Start Camera" to begin.';
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 w-full">
      <h1 className="font-poppins text-5xl font-extrabold text-white mb-8 text-center">Create Your Account</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-start" noValidate>
        <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg p-8">
          <div className="space-y-4">
            <h2 className="font-poppins text-3xl font-bold text-[#FF9933] mb-4">Voter Details</h2>
            <InputField label="Full Name" name="name" value={formState.name} onChange={handleInputChange} onBlur={handleBlur} error={errors.name} required />
            <InputField label="Aadhar Number" name="aadhar" value={formState.aadhar} onChange={handleInputChange} onBlur={handleBlur} error={errors.aadhar} required maxLength={12} inputMode="numeric" />
            <InputField label="Voter ID" name="voterId" value={formState.voterId} onChange={handleInputChange} onBlur={handleBlur} error={errors.voterId} required maxLength={10} />
          </div>
        </div>

        <div className="flex flex-col items-center space-y-4">
            <h2 className="font-poppins text-3xl font-bold text-[#FF9933] mb-4">Photo Capture</h2>
            <TriColorBorderBox borderStyle={photoData ? 'success' : 'default'} className="w-64 h-64 bg-gray-800/50 rounded-lg flex items-center justify-center overflow-hidden relative">
              {!isCameraActive && !photoData && (
                <div className="text-center p-4">
                  <CameraIcon className="w-24 h-24 text-gray-400 mx-auto" />
                   {cameraError && <p className="text-red-400 text-sm mt-2">{cameraError}</p>}
                </div>
              )}
              {isCameraActive && <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />}
              {isCameraActive && countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <span className="font-poppins text-9xl font-extrabold text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.7)]" style={{ animation: 'zoom-in-out 1s infinite' }}>
                    {countdown}
                  </span>
                </div>
              )}
              {photoData && <img src={photoData} alt="Voter" className="w-full h-full object-cover scale-x-[-1]" />}
            </TriColorBorderBox>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <p className="text-center text-sm text-gray-400 max-w-xs h-10">
              {getHelperText()}
              {errors.photo && <span className="text-red-400">{errors.photo}</span>}
            </p>
            
            <div className="h-14 flex items-center">
              {!isCameraActive && !photoData && <Button type="button" onClick={handleStartCamera}>Start Camera</Button>}
              {isCameraActive && (
                <Button type="button" onClick={handleStartCapture} disabled={countdown !== null}>
                  {countdown !== null ? 'Capturing...' : 'Capture'}
                </Button>
              )}
              {photoData && <Button type="button" onClick={handleRetake}>Retake Photo</Button>}
            </div>
        </div>

        {errors.api && (
            <div className="md:col-span-2 p-3 bg-red-900/50 border border-red-500 rounded-lg text-center -mt-4">
                <p className="text-red-300">{errors.api}</p>
            </div>
        )}

        <div className="md:col-span-2 flex justify-center mt-6 space-x-6">
            <Button type="button" onClick={() => setCurrentPage(Page.LOGIN)} variant="secondary">Back to Login</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>Register</Button>
        </div>
      </form>
    </div>
  );
};

export default SignUpPage;