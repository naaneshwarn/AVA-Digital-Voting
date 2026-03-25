import React, { useState, useEffect, useCallback } from 'react';
import { backendService } from '../../services/backendService.ts';
import { UserData } from '../../types.ts';
import PersonPlaceholderIcon from '../icons/PersonPlaceholderIcon.tsx';
import Button from '../Button.tsx';
import DeleteIcon from '../icons/DeleteIcon.tsx';
import CloseIcon from '../icons/CloseIcon.tsx';

const VoterList: React.FC = () => {
  const [voters, setVoters] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [voterToDelete, setVoterToDelete] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // FIX: Broaden type to include all possible election statuses.
  const [electionStatus, setElectionStatus] = useState<'NOT_STARTED' | 'IN_PROGRESS' | 'DECLARED'>('NOT_STARTED');
  const [isFlushModalOpen, setIsFlushModalOpen] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);

  const fetchVoters = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await backendService.getAllVoters();
      setVoters(data);
    } catch (error) {
      console.error("Failed to fetch voters:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchElectionStatus = useCallback(async () => {
    const status = await backendService.getElectionStatus();
    setElectionStatus(status);
  }, []);

  useEffect(() => {
    fetchVoters();
    fetchElectionStatus();

    backendService.subscribeToVoterChanges(fetchVoters);
    backendService.subscribeToElectionStatusChanges(fetchElectionStatus);

    return () => {
        backendService.unsubscribeFromVoterChanges(fetchVoters);
        backendService.unsubscribeFromElectionStatusChanges(fetchElectionStatus);
    };
  }, [fetchVoters, fetchElectionStatus]);

  const openDeleteModal = (voter: UserData) => {
    setVoterToDelete(voter);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setVoterToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!voterToDelete) return;
    setIsDeleting(true);
    await backendService.deleteVoter(voterToDelete.voterId);
    // await fetchVoters(); // No longer needed due to subscription
    setIsDeleting(false);
    closeDeleteModal();
  };
  
  const openFlushModal = () => setIsFlushModalOpen(true);
  const closeFlushModal = () => setIsFlushModalOpen(false);

  const handleConfirmFlush = async () => {
    setIsFlushing(true);
    await backendService.flushElectionData();
    // list will refresh via subscription
    setIsFlushing(false);
    closeFlushModal();
  };

  if (isLoading) {
    return <p className="text-center text-gray-400 text-xl">Loading voter information...</p>;
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        {/* FIX: Allow flushing data when election is not in progress, consistent with backend logic. */}
        {electionStatus !== 'IN_PROGRESS' && (
            <Button
                onClick={openFlushModal}
                disabled={isFlushing}
                className="bg-red-600 hover:bg-red-700 hover:shadow-[0_0_20px_#ef4444]"
            >
                Flush All Data
            </Button>
        )}
      </div>
      <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="p-4 font-poppins font-semibold text-white text-center">Photo</th>
                <th className="p-4 font-poppins font-semibold text-white">Name</th>
                <th className="p-4 font-poppins font-semibold text-white">Aadhar Number</th>
                <th className="p-4 font-poppins font-semibold text-white">Voter ID</th>
                <th className="p-4 font-poppins font-semibold text-white text-center">Has Voted</th>
                <th className="p-4 font-poppins font-semibold text-white text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {voters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-12">No voters have registered yet.</td>
                </tr>
              ) : (
                voters.map((voter, index) => (
                  <tr key={voter.voterId} className={`align-middle ${index % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-800/50'}`}>
                    <td className="p-2">
                      <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-600 mx-auto">
                        {voter.photo ? (
                          <img src={voter.photo} alt={voter.name} className="w-full h-full object-cover scale-x-[-1]" />
                        ) : (
                          <PersonPlaceholderIcon className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-4">{voter.name}</td>
                    <td className="p-4 font-mono">{voter.aadhar}</td>
                    <td className="p-4 font-mono">{voter.voterId}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        voter.hasVoted 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {voter.hasVoted ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                        <Button
                            variant="secondary"
                            onClick={() => openDeleteModal(voter)}
                            className="!px-3 !py-2 hover:bg-red-800"
                            aria-label={`Delete voter ${voter.name}`}
                        >
                            <DeleteIcon />
                        </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {isDeleteModalOpen && voterToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.3s_ease-in-out]">
          <div className="relative bg-[#1E293B] border-gray-700 border rounded-2xl shadow-lg p-8 w-full max-w-md m-4 text-center">
            <button onClick={closeDeleteModal} className="absolute top-4 right-4 text-gray-400 hover:text-white"><CloseIcon /></button>
            <h2 className="font-poppins text-3xl font-bold text-red-400 mb-4">Confirm Deletion</h2>
            <p className="text-lg text-gray-300 mb-8">
              Are you sure you want to delete the registration for <strong className="font-bold text-white">{voterToDelete.name}</strong>?
              <br />
              This action cannot be undone.
            </p>
            <div className="flex justify-center gap-4">
              <Button type="button" variant="secondary" onClick={closeDeleteModal} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
                className="bg-red-600 hover:bg-red-700 hover:shadow-[0_0_20px_#ef4444]"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {isFlushModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.3s_ease-in-out]">
          <div className="relative bg-[#1E293B] border-gray-700 border rounded-2xl shadow-lg p-8 w-full max-w-md m-4 text-center">
            <button onClick={closeFlushModal} className="absolute top-4 right-4 text-gray-400 hover:text-white"><CloseIcon /></button>
            <h2 className="font-poppins text-3xl font-bold text-red-400 mb-4">Confirm Data Flush</h2>
            <p className="text-lg text-gray-300 mb-8">
              Are you sure you want to delete ALL candidate and voter data? This action is irreversible and prepares the system for a new election.
            </p>
            <div className="flex justify-center gap-4">
              <Button type="button" variant="secondary" onClick={closeFlushModal} disabled={isFlushing}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmFlush}
                isLoading={isFlushing}
                className="bg-red-600 hover:bg-red-700 hover:shadow-[0_0_20px_#ef4444]"
              >
                Confirm Flush
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoterList;
