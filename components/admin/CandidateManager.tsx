import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Candidate } from '../../types.ts';
import { backendService } from '../../services/backendService.ts';
import Button from '../Button.tsx';
import InputField from '../InputField.tsx';
import PersonPlaceholderIcon from '../icons/PersonPlaceholderIcon.tsx';
import CloseIcon from '../icons/CloseIcon.tsx';
import PlusIcon from '../icons/PlusIcon.tsx';
import EditIcon from '../icons/EditIcon.tsx';
import DeleteIcon from '../icons/DeleteIcon.tsx';

const CandidateManager: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // FIX: Update the type for `electionStatus` to include 'DECLARED' to handle all possible states from the backend.
  const [electionStatus, setElectionStatus] = useState<'NOT_STARTED' | 'IN_PROGRESS' | 'DECLARED'>('NOT_STARTED');

  // Modal states
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | 'crop' | 'flush' | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [formState, setFormState] = useState({ name: '', party: '' });
  
  // Image crop states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const fetchCandidates = useCallback(async () => {
    setIsLoading(true);
    const data = await backendService.getCandidates();
    setCandidates(data);
    setIsLoading(false);
  }, []);
  
  const fetchElectionStatus = useCallback(async () => {
    const status = await backendService.getElectionStatus();
    setElectionStatus(status);
  }, []);

  useEffect(() => {
    fetchCandidates();
    fetchElectionStatus();

    backendService.subscribeToCandidateChanges(fetchCandidates);
    backendService.subscribeToElectionStatusChanges(fetchElectionStatus);

    return () => {
        backendService.unsubscribeFromCandidateChanges(fetchCandidates);
        backendService.unsubscribeFromElectionStatusChanges(fetchElectionStatus);
    };
  }, [fetchCandidates, fetchElectionStatus]);

  useEffect(() => {
    const image = imageRef.current;
    if (image && imageSrc) {
      const handleImageLoad = () => {
        const container = imageContainerRef.current;
        if (!container || !image.naturalWidth) return;

        const { naturalWidth, naturalHeight } = image;
        const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();

        // Calculate scale to make the image cover the container
        const scaleX = containerWidth / naturalWidth;
        const scaleY = containerHeight / naturalHeight;
        const scale = Math.max(scaleX, scaleY); // Use max to cover the area
        setImageScale(scale);

        // Center the image
        const initialX = (containerWidth - naturalWidth * scale) / 2;
        const initialY = (containerHeight - naturalHeight * scale) / 2;
        setImagePan({ x: initialX, y: initialY });
      };

      image.onload = handleImageLoad;
      // If the image is already loaded from cache, onload might not fire, so call it manually.
      if (image.complete && image.naturalWidth > 0) {
        handleImageLoad();
      }
    }
  }, [imageSrc]);

  const closeModal = () => {
    setModal(null);
    setSelectedCandidate(null);
    setFormState({ name: '', party: '' });
    setImageSrc(null);
    setImagePan({ x: 0, y: 0 });
    setImageScale(1);
  };

  // --- Modal Open Handlers ---
  const handleAdd = () => {
    setFormState({ name: '', party: '' });
    setModal('add');
  };

  const handleEdit = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setFormState({ name: candidate.name, party: candidate.party });
    setModal('edit');
  };

  const handleDelete = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setModal('delete');
  };

  const handleUploadClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    fileInputRef.current?.click();
  };

  // --- Action Handlers ---
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.party) return;
    setIsSubmitting(true);
    if (modal === 'edit' && selectedCandidate) {
      await backendService.updateCandidate({ ...selectedCandidate, ...formState });
    } else {
      await backendService.addCandidate(formState);
    }
    setIsSubmitting(false);
    closeModal();
  };
  
  const handleDeleteConfirm = async () => {
    if (!selectedCandidate) return;
    setIsSubmitting(true);
    await backendService.deleteCandidate(selectedCandidate.id);
    setIsSubmitting(false);
    closeModal();
  };

  const handleConfirmFlush = async () => {
    setIsSubmitting(true);
    await backendService.flushElectionData();
    setIsSubmitting(false);
    closeModal();
  };
  
  const handleStartElection = async () => {
    setIsSubmitting(true);
    await backendService.startElection();
    // Status will update via subscription
    setIsSubmitting(false);
  };

  const handleStopElection = async () => {
    setIsSubmitting(true);
    await backendService.stopElection();
    // Status will update via subscription
    setIsSubmitting(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
        setModal('crop');
      };
      reader.readAsDataURL(e.target.files[0]);
    }
    e.target.value = ''; // Reset file input
  };
  
  // --- Image Panning Handlers ---
  const onPanStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setIsPanning(true);
    setPanStart({ x: clientX - imagePan.x, y: clientY - imagePan.y });
  };
  
  const onPanMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPanning || !imageRef.current || !imageContainerRef.current) return;

    const image = imageRef.current;
    const container = imageContainerRef.current;
    const { naturalWidth, naturalHeight } = image;
    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    let newX = clientX - panStart.x;
    let newY = clientY - panStart.y;

    // Constrain panning so the image always covers the container
    const minX = containerWidth - naturalWidth * imageScale;
    const minY = containerHeight - naturalHeight * imageScale;
    
    newX = Math.max(minX, Math.min(0, newX));
    newY = Math.max(minY, Math.min(0, newY));

    setImagePan({ x: newX, y: newY });
  };
  
  const onPanEnd = () => {
    setIsPanning(false);
  };

  // --- Image Upload Handler ---
  const handleCropAndUpload = async () => {
    if (!canvasRef.current || !imageRef.current || !selectedCandidate) return;
    setIsSubmitting(true);
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        setIsSubmitting(false);
        return;
    }
    
    // The source rectangle on the original, unscaled image.
    const sx = -imagePan.x / imageScale;
    const sy = -imagePan.y / imageScale;
    const sWidth = canvas.width / imageScale;
    const sHeight = canvas.height / imageScale;

    // The destination rectangle on the canvas is the full canvas.
    const dx = 0;
    const dy = 0;
    const dWidth = canvas.width;
    const dHeight = canvas.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);

    const croppedImageData = canvas.toDataURL('image/jpeg', 0.9);
    
    await backendService.updateCandidate({ ...selectedCandidate, photo: croppedImageData });
    setIsSubmitting(false);
    closeModal();
  };

  const isElectionStarted = electionStatus === 'IN_PROGRESS';

  return (
    <div>
      <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" />
      <canvas ref={canvasRef} width={256} height={256} className="hidden"></canvas>
      
      <div className="w-full bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div className="flex-grow">
            <p className="text-gray-300 text-lg">Manage election candidates below.</p>
            <p className={`text-sm font-bold ${isElectionStarted ? 'text-green-400' : 'text-yellow-400'}`}>
              Election Status: {isElectionStarted ? 'In Progress' : 'Not Started'}
            </p>
          </div>
          <div className="flex gap-4">
            <Button onClick={handleAdd} disabled={isElectionStarted}><PlusIcon className="mr-2"/> Add Candidate</Button>
            {isElectionStarted ? (
              <Button
                onClick={handleStopElection}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 hover:shadow-[0_0_20px_#ef4444] disabled:bg-red-800/50 disabled:hover:shadow-none"
              >
                Stop Election
              </Button>
            ) : (
             <>
                <Button
                    onClick={handleStartElection}
                    disabled={candidates.length === 0 || isSubmitting}
                    className="bg-green-600 hover:bg-green-700 hover:shadow-[0_0_20px_#10B981] disabled:bg-green-800/50 disabled:hover:shadow-none"
                >
                    Start Election
                </Button>
                <Button
                    onClick={() => setModal('flush')}
                    disabled={isSubmitting}
                    className="bg-red-600 hover:bg-red-700 hover:shadow-[0_0_20px_#ef4444]"
                >
                    Flush All Data
                </Button>
             </>
            )}
          </div>
        </div>
        
        {isLoading ? (
          <p className="text-center text-gray-400 py-8">Loading candidates...</p>
        ) : candidates.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No candidates found. Click 'Add New Candidate' to begin.</p>
        ) : (
          <div className="space-y-4">
            {candidates.map(candidate => (
              <div key={candidate.id} className="bg-slate-800/50 p-4 rounded-lg flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-600">
                    {candidate.photo ? (
                      <img src={candidate.photo} alt={candidate.name} className="w-full h-full object-cover" />
                    ) : (
                      <PersonPlaceholderIcon className="w-12 h-12 text-slate-800" />
                    )}
                  </div>
                  <div>
                    <p className="font-poppins text-xl font-bold text-white">{candidate.name}</p>
                    <p className="text-gray-400">{candidate.party}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="secondary" onClick={() => handleUploadClick(candidate)} className="!px-4 !py-2" disabled={isElectionStarted}>Upload Photo</Button>
                  <Button variant="secondary" onClick={() => handleEdit(candidate)} className="!px-4 !py-2" disabled={isElectionStarted}><EditIcon /></Button>
                  <Button variant="secondary" onClick={() => handleDelete(candidate)} className="!px-4 !py-2 hover:bg-red-800" disabled={isElectionStarted}><DeleteIcon /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.3s_ease-in-out]" onMouseMove={modal === 'crop' ? onPanMove : undefined} onMouseUp={modal === 'crop' ? onPanEnd : undefined} onTouchMove={modal === 'crop' ? onPanMove : undefined} onTouchEnd={modal === 'crop' ? onPanEnd : undefined}>
          <div className="relative bg-[#1E293B] border-gray-700 border rounded-2xl shadow-lg p-8 w-full max-w-md m-4">
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white"><CloseIcon /></button>
            
            {(modal === 'add' || modal === 'edit') && (
              <form onSubmit={handleFormSubmit}>
                <h2 className="font-poppins text-3xl font-bold text-white mb-6 text-center">{modal === 'add' ? 'Add New Candidate' : 'Edit Candidate'}</h2>
                <div className="space-y-4">
                  <InputField label="Full Name" name="name" value={formState.name} onChange={e => setFormState({...formState, name: e.target.value})} required />
                  <InputField label="Party Name" name="party" value={formState.party} onChange={e => setFormState({...formState, party: e.target.value})} required />
                </div>
                <div className="flex justify-center mt-8 gap-4">
                  <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={isSubmitting}>Save</Button>
                </div>
              </form>
            )}

            {modal === 'delete' && selectedCandidate && (
              <div className="text-center">
                <h2 className="font-poppins text-3xl font-bold text-red-400 mb-4">Confirm Deletion</h2>
                <p className="text-lg text-gray-300 mb-8">Are you sure you want to remove <strong className="font-bold text-white">{selectedCandidate.name}</strong> from the election? This action cannot be undone.</p>
                <div className="flex justify-center gap-4">
                  <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                  <Button onClick={handleDeleteConfirm} isLoading={isSubmitting} className="bg-red-600 hover:bg-red-700 hover:shadow-[0_0_20px_#ef4444]">Confirm Delete</Button>
                </div>
              </div>
            )}
            
            {modal === 'crop' && imageSrc && (
              <div className="text-center">
                <h2 className="font-poppins text-3xl font-bold text-white mb-4">Position Photo</h2>
                <p className="text-gray-400 mb-6">Click and drag the image to position it inside the circle.</p>
                <div 
                  ref={imageContainerRef}
                  className="w-64 h-64 mx-auto rounded-full overflow-hidden bg-gray-900 cursor-move border-4 border-gray-600" onMouseDown={onPanStart} onTouchStart={onPanStart}>
                   <img 
                    ref={imageRef} 
                    src={imageSrc} 
                    alt="Preview" 
                    className="max-w-none"
                    style={{ 
                        transform: `translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageScale})`,
                        transformOrigin: 'top left' 
                    }} 
                    draggable="false" />
                </div>
                <div className="flex justify-center mt-8 gap-4">
                  <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                  <Button onClick={handleCropAndUpload} isLoading={isSubmitting}>Upload</Button>
                </div>
              </div>
            )}

            {modal === 'flush' && (
              <div className="text-center">
                <h2 className="font-poppins text-3xl font-bold text-red-400 mb-4">Confirm Data Flush</h2>
                <p className="text-lg text-gray-300 mb-8">Are you sure you want to delete ALL candidate and voter data? This action is irreversible and prepares the system for a new election.</p>
                <div className="flex justify-center gap-4">
                  <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                  <Button onClick={handleConfirmFlush} isLoading={isSubmitting} className="bg-red-600 hover:bg-red-700 hover:shadow-[0_0_20px_#ef4444]">Confirm Flush</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateManager;