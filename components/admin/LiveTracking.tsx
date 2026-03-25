import React, { useState, useEffect, useCallback } from 'react';
import { backendService } from '../../services/backendService.ts';
import { Candidate } from '../../types.ts';

interface VoteResult {
  candidate: Candidate;
  votes: number;
}

const LiveTracking: React.FC = () => {
  const [results, setResults] = useState<VoteResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchVoteCounts = useCallback(async () => {
    try {
      const data = await backendService.getVoteCounts();
      setResults(data.results);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch vote counts:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVoteCounts(); // Initial fetch

    backendService.subscribeToVoteChanges(fetchVoteCounts);

    return () => {
      backendService.unsubscribeFromVoteChanges(fetchVoteCounts);
    };
  }, [fetchVoteCounts]);

  const totalVotes = results.reduce((sum, result) => sum + result.votes, 0);
  const maxVotes = Math.max(1, ...results.map(r => r.votes)); // Ensure maxVotes is at least 1 to avoid division by zero

  const barColors = ['bg-saffron', 'bg-green', 'bg-blue', 'bg-red', 'bg-yellow', 'bg-indigo'];
  const triColorGradient = 'from-[#FF9933] via-white to-[#138808]';


  if (isLoading) {
    return <p className="text-center text-gray-400 text-xl">Loading live results...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg p-6 flex justify-between items-center">
        <div>
          <h3 className="font-poppins text-xl font-semibold text-gray-400">Total Votes Cast</h3>
          <p className="font-poppins text-5xl font-extrabold text-white">{totalVotes}</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>Live Feed</p>
          <p>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}</p>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg p-6">
        {results.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No candidates are registered yet. Add a candidate to begin tracking votes.</p>
        ) : (
          <div className="space-y-6">
            {results.map((result, index) => (
              <div key={result.candidate.id}>
                <div className="flex justify-between items-baseline mb-1">
                  <p className="font-poppins text-xl font-bold text-white">{result.candidate.name}</p>
                  <p className="font-poppins text-2xl font-bold text-gray-300">{result.votes}</p>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${triColorGradient} transition-all duration-500 ease-out`}
                    style={{ width: `${(result.votes / maxVotes) * 100}%` }}
                  />
                </div>
                 <p className="text-gray-400 text-sm mt-1">{result.candidate.party}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTracking;