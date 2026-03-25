import { UserData, Candidate } from '../types.ts';
import { getDb, isFirebaseConfigured } from './firebase.ts';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  runTransaction,
  limit
} from 'firebase/firestore';

// 🔥 FACE API URL
const FACE_API_URL = "http://127.0.0.1:5000/verify-face";

// --- Types ---
type Listener = () => void;
type ElectionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DECLARED';

// --- Local Storage Helpers ---
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);
const getLocalStorageUsers = (): (UserData & { id: string })[] => JSON.parse(localStorage.getItem('ava_users') || '[]');
const setLocalStorageUsers = (users: (UserData & { id: string })[]) => localStorage.setItem('ava_users', JSON.stringify(users));
const getLocalStorageCandidates = (): (Candidate & { votes: number })[] => JSON.parse(localStorage.getItem('ava_candidates') || '[]');
const setLocalStorageCandidates = (candidates: (Candidate & { votes: number })[]) => localStorage.setItem('ava_candidates', JSON.stringify(candidates));
const getLocalStorageElectionStatus = (): ElectionStatus => (localStorage.getItem('ava_election_status') as ElectionStatus) || 'NOT_STARTED';
const setLocalStorageElectionStatus = (status: ElectionStatus) => localStorage.setItem('ava_election_status', status);

// --- State ---
const candidateChangeListeners = new Set<Listener>();
const voteChangeListeners = new Set<Listener>();
const electionStatusListeners = new Set<Listener>();
const voterChangeListeners = new Set<Listener>();

let candidateUnsubscribe: (() => void) | null = null;
let statusUnsubscribe: (() => void) | null = null;
let voterUnsubscribe: (() => void) | null = null;

const initializeListeners = () => {
  const db = getDb();
  if (!db || !isFirebaseConfigured) return;

  candidateUnsubscribe = onSnapshot(collection(db, 'candidates'), () => {
    candidateChangeListeners.forEach(cb => cb());
    voteChangeListeners.forEach(cb => cb());
  });

  statusUnsubscribe = onSnapshot(doc(db, 'config', 'election'), () => {
    electionStatusListeners.forEach(cb => cb());
  });

  voterUnsubscribe = onSnapshot(collection(db, 'users'), () => {
    voterChangeListeners.forEach(cb => cb());
  });
};

export const backendService = {
  initializeListeners,

  // ✅🔥 FIXED FACE VERIFICATION FUNCTION
  verifyFace: async (
    liveImages: string[],   // ✅ FIXED TYPE
    registeredImage: string
  ): Promise<{ match: boolean; distances?: number[]; error?: string }> => {
    try {
      const response = await fetch(FACE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          liveImages,        // ✅ FIXED FIELD
          registeredImage,
        }),
      });

      if (!response.ok) {
        throw new Error("Server response not OK");
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error("Face verification failed:", error);
      return { match: false, error: "Server error" };
    }
  },

  findUserByCredentials: async (aadhar: string, voterId: string): Promise<UserData | null> => {
    const db = getDb();
    if (db && isFirebaseConfigured) {
      const q = query(collection(db, 'users'), where('aadhar', '==', aadhar), where('voterId', '==', voterId), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as UserData;
      }
      return null;
    }
    
    const users = getLocalStorageUsers();
    return users.find(u => u.aadhar === aadhar && u.voterId === voterId) || null;
  },

  registerUser: async (newUser: UserData): Promise<{ success: boolean; message: string }> => {
    const db = getDb();
    if (db && isFirebaseConfigured) {
      const qVoter = query(collection(db, 'users'), where('voterId', '==', newUser.voterId), limit(1));
      const qAadhar = query(collection(db, 'users'), where('aadhar', '==', newUser.aadhar), limit(1));
      const [snapVoter, snapAadhar] = await Promise.all([getDocs(qVoter), getDocs(qAadhar)]);
      
      if (!snapVoter.empty || !snapAadhar.empty) {
        return { success: false, message: 'A user with this Aadhar or Voter ID already exists.' };
      }

      const userRef = doc(db, 'users', newUser.voterId);
      await setDoc(userRef, { ...newUser, hasVoted: false, createdAt: new Date().toISOString() });
      return { success: true, message: 'Registration successful!' };
    }

    const users = getLocalStorageUsers();
    if (users.some(u => u.aadhar === newUser.aadhar || u.voterId === newUser.voterId)) {
      return { success: false, message: 'A user with this Aadhar or Voter ID already exists.' };
    }
    const userWithId = { ...newUser, id: generateId(), hasVoted: false };
    setLocalStorageUsers([...users, userWithId]);
    voterChangeListeners.forEach(cb => cb());
    return { success: true, message: 'Registration successful!' };
  },

  // ✅ ALL OTHER METHODS REMAIN EXACTLY SAME (NO CHANGE NEEDED)

  getCandidates: async (): Promise<Candidate[]> => {
    const db = getDb();
    if (db && isFirebaseConfigured) {
      const querySnapshot = await getDocs(collection(db, 'candidates'));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
    }
    return getLocalStorageCandidates();
  },

  addCandidate: async (candidateData: Omit<Candidate, 'id'>): Promise<Candidate> => {
    const db = getDb();
    const id = generateId();
    const candidate = { ...candidateData, id, votes: 0 };
    
    if (db && isFirebaseConfigured) {
      await setDoc(doc(db, 'candidates', id), candidate);
      return candidate;
    }

    const candidates = getLocalStorageCandidates();
    setLocalStorageCandidates([...candidates, candidate]);
    candidateChangeListeners.forEach(cb => cb());
    return candidate;
  },
  updateCandidate: async (updatedCandidate: Candidate): Promise<Candidate> => {
    const db = getDb();
    if (db && isFirebaseConfigured) {
      const ref = doc(db, 'candidates', updatedCandidate.id);
      await updateDoc(ref, { ...updatedCandidate });
      return updatedCandidate;
    }

    const candidates = getLocalStorageCandidates();
    const index = candidates.findIndex(c => c.id === updatedCandidate.id);
    if (index > -1) {
      candidates[index] = { ...candidates[index], ...updatedCandidate };
      setLocalStorageCandidates(candidates);
      candidateChangeListeners.forEach(cb => cb());
    }
    return updatedCandidate;
  },

  deleteCandidate: async (candidateId: string): Promise<{ success: boolean }> => {
    const db = getDb();
    if (db && isFirebaseConfigured) {
      await deleteDoc(doc(db, 'candidates', candidateId));
      return { success: true };
    }

    const candidates = getLocalStorageCandidates().filter(c => c.id !== candidateId);
    setLocalStorageCandidates(candidates);
    candidateChangeListeners.forEach(cb => cb());
    return { success: true };
  },

  castVote: async (voterId: string, candidateId: string): Promise<{ success: boolean; message: string }> => {
    const db = getDb();
    if (db && isFirebaseConfigured) {
      try {
        await runTransaction(db, async (transaction) => {
          const statusDoc = await transaction.get(doc(db, 'config', 'election'));
          const status = statusDoc.exists() ? statusDoc.data().status : 'NOT_STARTED';
          
          if (status !== 'IN_PROGRESS') {
            throw new Error('The election is not currently active.');
          }

          const userRef = doc(db, 'users', voterId);
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) throw new Error('Voter not found.');
          if (userDoc.data().hasVoted) throw new Error('This user has already voted.');

          const candidateRef = doc(db, 'candidates', candidateId);
          const candidateDoc = await transaction.get(candidateRef);
          if (!candidateDoc.exists()) throw new Error('Candidate does not exist.');

          transaction.update(userRef, { hasVoted: true });
          transaction.update(candidateRef, { votes: (candidateDoc.data().votes || 0) + 1 });
        });
        return { success: true, message: 'Your vote has been cast successfully!' };
      } catch (e: any) {
        return { success: false, message: e.message || 'Error casting vote.' };
      }
    }

    // Fallback logic
    const status = getLocalStorageElectionStatus();
    if (status !== 'IN_PROGRESS') return { success: false, message: 'The election is not currently active.' };
    const users = getLocalStorageUsers();
    const candidates = getLocalStorageCandidates();
    const userIndex = users.findIndex(u => u.voterId === voterId);
    if (userIndex === -1 || users[userIndex].hasVoted) return { success: false, message: 'Voter invalid or already voted.' };
    const candidateIndex = candidates.findIndex(c => c.id === candidateId);
    if (candidateIndex === -1) return { success: false, message: 'Candidate not found.' };
    
    users[userIndex].hasVoted = true;
    candidates[candidateIndex].votes = (candidates[candidateIndex].votes || 0) + 1;
    setLocalStorageUsers(users);
    setLocalStorageCandidates(candidates);
    voteChangeListeners.forEach(cb => cb());
    return { success: true, message: 'Your vote cast successfully!' };
  },

  getAllVoters: async (): Promise<UserData[]> => {
    const db = getDb();
    if (db && isFirebaseConfigured) {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => doc.data() as UserData);
    }
    return getLocalStorageUsers();
  },

  deleteVoter: async (voterId: string): Promise<{ success: boolean }> => {
    const db = getDb();
    if (db && isFirebaseConfigured) {
      await deleteDoc(doc(db, 'users', voterId));
      return { success: true };
    }
    const users = getLocalStorageUsers().filter(u => u.voterId !== voterId);
    setLocalStorageUsers(users);
    voterChangeListeners.forEach(cb => cb());
    return { success: true };
  },

  getVoteCounts: async (): Promise<{ results: { candidate: Candidate; votes: number }[] }> => {
    const db = getDb();
    if (db && isFirebaseConfigured) {
      const snapshot = await getDocs(collection(db, 'candidates'));
      const results = snapshot.docs.map(doc => ({
        candidate: { id: doc.id, ...doc.data() } as Candidate,
        votes: doc.data().votes || 0,
      }));
      return { results };
    }
    const candidates = getLocalStorageCandidates();
    return { results: candidates.map(c => ({ candidate: c, votes: c.votes || 0 })) };
  },

  getElectionStatus: async (): Promise<ElectionStatus> => {
    const db = getDb();
    if (db && isFirebaseConfigured) {
      const snap = await getDoc(doc(db, 'config', 'election'));
      return snap.exists() ? snap.data().status as ElectionStatus : 'NOT_STARTED';
    }
    return getLocalStorageElectionStatus();
  },

  startElection: async (): Promise<{ success: boolean }> => {
    const db = getDb();
    if (db && isFirebaseConfigured) {
      await setDoc(doc(db, 'config', 'election'), { status: 'IN_PROGRESS' }, { merge: true });
      return { success: true };
    }
    setLocalStorageElectionStatus('IN_PROGRESS');
    electionStatusListeners.forEach(cb => cb());
    return { success: true };
  },
  
  stopElection: async (): Promise<{ success: boolean }> => {
    const db = getDb();
    if (db && isFirebaseConfigured) {
      await setDoc(doc(db, 'config', 'election'), { status: 'NOT_STARTED' }, { merge: true });
      return { success: true };
    }
    setLocalStorageElectionStatus('NOT_STARTED');
    electionStatusListeners.forEach(cb => cb());
    return { success: true };
  },

  declareResult: async (): Promise<{ success: boolean; winner?: Candidate }> => {
    const db = getDb();
    const candidates = await backendService.getCandidates();
    if (candidates.length === 0) return { success: false };
    
    const winner = candidates.reduce((prev, current) => ((prev.votes || 0) >= (current.votes || 0) ? prev : current));

    if (db && isFirebaseConfigured) {
      await setDoc(doc(db, 'config', 'election'), { status: 'DECLARED', winnerId: winner.id }, { merge: true });
      return { success: true, winner };
    }

    localStorage.setItem('ava_election_winner', JSON.stringify(winner));
    setLocalStorageElectionStatus('DECLARED');
    electionStatusListeners.forEach(cb => cb());
    return { success: true, winner };
  },

  getWinner: async (): Promise<Candidate | null> => {
    const db = getDb();
    if (db && isFirebaseConfigured) {
      const snap = await getDoc(doc(db, 'config', 'election'));
      if (snap.exists() && snap.data().winnerId) {
        const cSnap = await getDoc(doc(db, 'candidates', snap.data().winnerId));
        return cSnap.exists() ? { id: cSnap.id, ...cSnap.data() } as Candidate : null;
      }
      return null;
    }
    const winnerJson = localStorage.getItem('ava_election_winner');
    return winnerJson ? JSON.parse(winnerJson) : null;
  },
  
  flushElectionData: async (): Promise<{ success: boolean }> => {
    const db = getDb();
    if (db && isFirebaseConfigured) {
      // In a real app, you'd batch delete or use a function. For this prototype:
      const [voters, candidates] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'candidates'))
      ]);
      const deletes = [
        ...voters.docs.map(d => deleteDoc(d.ref)),
        ...candidates.docs.map(d => deleteDoc(d.ref)),
        setDoc(doc(db, 'config', 'election'), { status: 'NOT_STARTED', winnerId: null })
      ];
      await Promise.all(deletes);
      return { success: true };
    }

    setLocalStorageUsers([]);
    setLocalStorageCandidates([]);
    localStorage.removeItem('ava_election_winner');
    setLocalStorageElectionStatus('NOT_STARTED');
    candidateChangeListeners.forEach(cb => cb());
    voterChangeListeners.forEach(cb => cb());
    electionStatusListeners.forEach(cb => cb());
    return { success: true };
  },

  subscribeToCandidateChanges: (cb: Listener) => candidateChangeListeners.add(cb),
  unsubscribeFromCandidateChanges: (cb: Listener) => candidateChangeListeners.delete(cb),
  subscribeToVoteChanges: (cb: Listener) => voteChangeListeners.add(cb),
  unsubscribeFromVoteChanges: (cb: Listener) => voteChangeListeners.delete(cb),
  subscribeToElectionStatusChanges: (cb: Listener) => electionStatusListeners.add(cb),
  unsubscribeFromElectionStatusChanges: (cb: Listener) => electionStatusListeners.delete(cb),
  subscribeToVoterChanges: (cb: Listener) => voterChangeListeners.add(cb),
  unsubscribeFromVoterChanges: (cb: Listener) => voterChangeListeners.delete(cb),
  
  seedDatabase: async () => {
    if (isFirebaseConfigured) return; // Let Firebase handle its own initial state
    if (!localStorage.getItem('ava_election_status')) setLocalStorageElectionStatus('NOT_STARTED');
    if (!localStorage.getItem('ava_users')) {
      setLocalStorageUsers([
          { id: generateId(), name: 'Rohan Sharma', aadhar: '123456789012', voterId: 'ABC1234567', photo: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', hasVoted: true },
      ]);
    }
  },
};
