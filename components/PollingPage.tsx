import React, { useState, useEffect, useCallback } from 'react';
import { UserData, Candidate } from '../types.ts';
import { backendService } from '../services/backendService.ts';
import Button from './Button.tsx';
import TriColorBorderBox from './TriColorBorderBox.tsx';
import PersonPlaceholderIcon from './icons/PersonPlaceholderIcon.tsx';

interface PollingPageProps {
  setCurrentPage: () => void;
  currentUser: UserData | null;
}

type ElectionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DECLARED';

const PollingPage: React.FC<PollingPageProps> = ({ setCurrentPage, currentUser }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCasting, setIsCasting] = useState(false);
  const [voteStatus, setVoteStatus] = useState<'pending' | 'confirm' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState('');
  const [electionStatus, setElectionStatus] = useState<ElectionStatus | null>(null);
  const [winner, setWinner] = useState<Candidate | null>(null);

  const fetchCandidates = useCallback(async () => {
    const data = await backendService.getCandidates();
    setCandidates(data);
    setIsLoading(false);
  }, []);

  const fetchStatusAndWinner = useCallback(async () => {
    const status = await backendService.getElectionStatus();
    setElectionStatus(status);
    if (status === 'DECLARED') {
        const winnerData = await backendService.getWinner();
        setWinner(winnerData);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
    fetchStatusAndWinner();

    const handleCandidatesChange = () => fetchCandidates();
    backendService.subscribeToCandidateChanges(handleCandidatesChange);
    backendService.subscribeToElectionStatusChanges(fetchStatusAndWinner);

    return () => {
      backendService.unsubscribeFromCandidateChanges(handleCandidatesChange);
      backendService.unsubscribeFromElectionStatusChanges(fetchStatusAndWinner);
    };
  }, [fetchCandidates, fetchStatusAndWinner]);

  const isElectionActive = electionStatus === 'IN_PROGRESS';

  const handleSelectCandidate = (id: string) => {
    if (voteStatus === 'pending' && isElectionActive) {
      setSelectedCandidateId(id);
    }
  };

  const handleConfirmVote = async () => {
    if (!selectedCandidateId || !currentUser) return;
    setIsCasting(true);
    setErrorMessage('');
    
    const result = await backendService.castVote(currentUser.voterId, selectedCandidateId);
    
    if (result.success) {
      setVoteStatus('success');
    } else {
      setVoteStatus('error');
      setErrorMessage(result.message);
    }
    setIsCasting(false);
  };

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

  if (electionStatus === 'DECLARED' && winner) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.3s_ease-in-out]">
            <div className="bg-[#1E293B] border-gray-700 border rounded-2xl shadow-lg p-8 text-center w-full max-w-lg m-4">
                <h1 className="font-poppins text-2xl font-bold text-gray-400 mb-2">The Election Has Concluded</h1>
                <h2 className="font-poppins text-4xl font-extrabold text-white mb-6">Winner Declared!</h2>
                <div className="flex flex-col items-center gap-4 bg-black/20 p-6 rounded-lg tri-gradient-border animate-[glow-pulse-saffron_4s_infinite]">
                    <div className="w-40 h-40 flex-shrink-0 bg-white rounded-full flex items-center justify-center overflow-hidden border-4 border-gray-400">
                        {winner.photo ? (
                        <img src={winner.photo} alt={winner.name} className="w-full h-full object-cover" />
                        ) : (
                        <PersonPlaceholderIcon className="w-32 h-32 text-slate-800" />
                        )}
                    </div>
                    <div className="text-center">
                        <h3 className="font-poppins text-4xl font-bold text-[#FF9933]">{winner.name}</h3>
                        <p className="text-2xl text-gray-300">{winner.party}</p>
                    </div>
                </div>
                 <Button onClick={setCurrentPage} className="mt-8">Return to Home</Button>
            </div>
        </div>
    )
  }

  if (isLoading || electionStatus === null) {
    return <div className="text-2xl text-white">Loading Ballot...</div>;
  }

  if (voteStatus === 'success') {
    return (
        <div className="flex flex-col items-center justify-center text-center p-8 animate-[fadeIn_0.5s_ease-in-out]">
            <div className="text-8xl mb-6">🗳️</div>
            <h1 className="font-poppins text-5xl font-extrabold text-white mb-4">Vote Cast Successfully!</h1>
            <p className="text-xl text-gray-300 mb-8">Thank you for your participation. Your voice has been heard.</p>
            <Button onClick={setCurrentPage}>Return to Home</Button>
        </div>
    );
  }
  
  if (voteStatus === 'error') {
     return (
        <div className="flex flex-col items-center justify-center text-center p-8 animate-[fadeIn_0.5s_ease-in-out]">
            <div className="text-8xl mb-6">⚠️</div>
            <h1 className="font-poppins text-5xl font-extrabold text-red-400 mb-4">Error Casting Vote</h1>
            <p className="text-lg text-gray-300 bg-red-900/50 p-4 rounded-lg mb-8">{errorMessage}</p>
            <Button onClick={() => setVoteStatus('pending')}>Try Again</Button>
        </div>
    );
  }

  if (voteStatus === 'confirm') {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 animate-[fadeIn_0.5s_ease-in-out]">
        <h1 className="font-poppins text-5xl font-extrabold text-white mb-8">Confirm Your Vote</h1>
        <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg p-8 max-w-lg mb-8">
            <p className="text-xl text-gray-300 mb-4">You have selected:</p>
            <h2 className="font-poppins text-4xl font-bold text-[#FF9933]">{selectedCandidate?.name}</h2>
            <p className="text-2xl text-gray-400">{selectedCandidate?.party}</p>
        </div>
        <p className="text-lg text-red-400 mb-8">This action is final and cannot be undone.</p>
        <div className="flex gap-6">
            <Button onClick={() => setVoteStatus('pending')} variant="secondary" disabled={isCasting}>Go Back</Button>
            <Button onClick={handleConfirmVote} variant="primary" isLoading={isCasting}>Cast My Vote</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start h-full p-4 md:p-8 w-full animate-[fadeIn_0.5s_ease-in-out]">
      <header className="w-full flex justify-between items-center mb-8 text-white">
        <div className="flex items-center gap-4">
            {currentUser?.photo ? (
                <img src={currentUser.photo} alt="Voter" className="w-16 h-16 rounded-full object-cover border-2 border-[#FF9933]"/>
            ) : (
                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center border-2 border-[#FF9933]">
                    <PersonPlaceholderIcon className="w-10 h-10 text-gray-400" />
                </div>
            )}
            <div>
                <h1 className="font-poppins text-3xl font-bold">{currentUser?.name}</h1>
                 <div className="flex items-center gap-4 mt-1">
                    <p className="text-gray-400">Voter ID: {currentUser?.voterId}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        isElectionActive 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                        Election {isElectionActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
        </div>
        <Button onClick={setCurrentPage} variant="secondary">Logout</Button>
      </header>

      <main className="w-full flex-grow">
        <h2 className="text-center font-poppins text-4xl font-extrabold text-white mb-6">Select Your Candidate</h2>
        {!isElectionActive && (
            <div className="text-center bg-yellow-900/50 border border-yellow-500 rounded-lg p-4 mb-6 max-w-3xl mx-auto">
                <p className="text-yellow-200">Voting is currently not active. You can view the candidates, but you cannot cast a vote at this time.</p>
            </div>
        )}
        {candidates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {candidates.map(candidate => (
              <TriColorBorderBox
                key={candidate.id}
                borderStyle={selectedCandidateId === candidate.id ? 'selected' : 'default'}
                className={`bg-black/20 backdrop-blur-md rounded-2xl p-4 ${isElectionActive ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-70'}`}
                onClick={isElectionActive ? () => handleSelectCandidate(candidate.id) : undefined}
              >
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 flex-shrink-0 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-600">
                    {candidate.photo ? (
                      <img src={candidate.photo} alt={candidate.name} className="w-full h-full object-cover" />
                    ) : (
                      <PersonPlaceholderIcon className="w-16 h-16 text-slate-800" />
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="font-poppins text-xl font-bold text-white">{candidate.name}</h3>
                    <p className="text-gray-400">{candidate.party}</p>
                  </div>
                </div>
              </TriColorBorderBox>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-16">
            <p className="text-2xl">The ballot is not yet finalized.</p>
            <p className="text-lg mt-2">Candidates will appear here once they are registered by an election official.</p>
          </div>
        )}
      </main>
      
      {candidates.length > 0 && (
        <footer className="w-full mt-8">
          <div className="flex justify-center">
              <Button onClick={() => setVoteStatus('confirm')} disabled={!selectedCandidateId || !isElectionActive}>
                  Confirm Selection
              </Button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default PollingPage;