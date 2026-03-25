export enum Page {
  HOME = 'HOME',
  USER_PORTAL = 'USER_PORTAL',
  SIGNUP = 'SIGNUP',
  LOGIN = 'LOGIN',
  POLLING = 'POLLING',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
}

export enum AdminPage {
  LIVE_TRACKING = 'LIVE_TRACKING',
  CANDIDATES = 'CANDIDATES',
  VOTERS = 'VOTERS',
  RESULTS = 'RESULTS',
}

export interface UserData {
  id?: string;
  name: string;
  aadhar: string;
  voterId: string;
  photo?: string;
  hasVoted?: boolean;
}

export interface Candidate {
  id: string;
  name: string;
  party: string;
  photo?: string;
  votes?: number;
}
