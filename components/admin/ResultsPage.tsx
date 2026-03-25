import React, { useState, useEffect, useCallback } from 'react';
import { backendService } from '../../services/backendService.ts';
import { Candidate } from '../../types.ts';
import PersonPlaceholderIcon from '../icons/PersonPlaceholderIcon.tsx';
import Button from '../Button.tsx';

interface VoteResult {
  candidate: Candidate;
  votes: number;
}

type ElectionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DECLARED';

const ResultsPage: React.FC = () => {
  const [results, setResults] = useState<VoteResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [electionStatus, setElectionStatus] = useState<ElectionStatus>('NOT_STARTED');
  const [isDeclaring, setIsDeclaring] = useState(false);
  const [winner, setWinner] = useState<Candidate | null>(null);

  const fetchResultsAndStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = await backendService.getElectionStatus();
      setElectionStatus(status);

      const data = await backendService.getVoteCounts();
      const sortedResults = data.results.sort((a, b) => b.votes - a.votes);
      setResults(sortedResults);

      if (status === 'DECLARED') {
        const winnerData = await backendService.getWinner();
        setWinner(winnerData);
      } else {
        setWinner(null);
      }

    } catch (error) {
      console.error("Failed to fetch results:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResultsAndStatus();
    backendService.subscribeToElectionStatusChanges(fetchResultsAndStatus);
    backendService.subscribeToVoteChanges(fetchResultsAndStatus);
    return () => {
      backendService.unsubscribeFromElectionStatusChanges(fetchResultsAndStatus);
      backendService.unsubscribeFromVoteChanges(fetchResultsAndStatus);
    }
  }, [fetchResultsAndStatus]);
  
  const totalVotes = results.reduce((sum, result) => sum + result.votes, 0);

  const handleDeclareResult = async () => {
    setIsDeclaring(true);
    await backendService.declareResult();
    // Status will update via subscription
    setIsDeclaring(false);
  };

  const getStatusMessage = () => {
    switch (electionStatus) {
        case 'IN_PROGRESS': return { text: 'Election is currently in progress.', color: 'text-green-400'};
        case 'DECLARED': return { text: 'The winner has been officially declared.', color: 'text-yellow-400'};
        case 'NOT_STARTED': return { text: 'Election is stopped. Results can be declared.', color: 'text-gray-400'};
        default: return { text: '', color: ''};
    }
  }

  if (isLoading) {
    return <p className="text-center text-gray-400 text-xl">Calculating final results...</p>;
  }
  
  return (
    <div className="space-y-8">
        <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg p-6 flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h3 className="font-poppins text-xl font-semibold text-gray-400">Total Votes Cast</h3>
              <p className="font-poppins text-5xl font-extrabold text-white">{totalVotes}</p>
            </div>
            <div className="text-right">
                <p className={`font-poppins font-bold ${getStatusMessage().color}`}>{getStatusMessage().text}</p>
                {electionStatus === 'NOT_STARTED' && results.length > 0 && totalVotes > 0 && (
                    <Button onClick={handleDeclareResult} isLoading={isDeclaring} disabled={isDeclaring} className="mt-2">
                        Declare Winner
                    </Button>
                )}
            </div>
        </div>

        <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg p-6">
            <h3 className="font-poppins text-2xl font-bold text-[#FF9933] mb-6">Final Standings</h3>
             {results.length === 0 ? (
                <p className="text-center text-gray-400 py-12">No votes have been cast as no candidates are registered.</p>
            ) : (
                <div className="space-y-4">
                    {results.map((result, index) => {
                       const isWinner = (electionStatus === 'DECLARED' && winner?.id === result.candidate.id) || (electionStatus !== 'DECLARED' && index === 0 && totalVotes > 0);
                       return (
                        <div key={result.candidate.id} className={`p-4 rounded-lg flex items-center justify-between transition-colors ${isWinner ? 'bg-yellow-500/10 border-yellow-500 border' : 'bg-slate-800/50'}`}>
                            <div className="flex items-center gap-4">
                                <div className="text-3xl font-bold text-gray-500 w-8 text-center">{index + 1}</div>
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-600">
                                    {result.candidate.photo ? (
                                    <img src={result.candidate.photo} alt={result.candidate.name} className="w-full h-full object-cover" />
                                    ) : (
                                    <PersonPlaceholderIcon className="w-12 h-12 text-slate-800" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-poppins text-xl font-bold text-white flex items-center gap-2">
                                        {result.candidate.name}
                                        {isWinner && <span title="Winner">👑</span>}
                                    </p>
                                    <p className="text-gray-400">{result.candidate.party}</p>
                                </div>
                            </div>
                            <div>
                               <p className="font-poppins text-3xl font-extrabold text-[#FF9933]">{result.votes}</p>
                               <p className="text-gray-500 text-right">Votes</p>
                            </div>
                        </div>
                       )
                    })}
                </div>
            )}
        </div>
    </div>
  );
};

export default ResultsPage;