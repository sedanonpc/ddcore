// Core data types for the sports betting application

export interface League {
  id: string;
  name: string;
  sport: string;
  gender?: string;
  imageURL: string;
}

export interface Competitor {
  id: string;
  name: string;
  abbreviation: string;
  imageURL: string;
}

export interface Match {
  id: string;
  leagueID: string;
  location: {
    title: string;
  };
  scheduledDateInUTC: string;
  title: string;
  subtitle: string;
  competitorIDs: string[];
  conference?: string;
}

export interface MatchData {
  leagues: Record<string, League>;
  competitors: Record<string, Record<string, Competitor>>;
  matches: {
    orderedIDsForDisplay: string[];
    data: Record<string, Match>;
  };
}

export interface BetAmount {
  currency: string;
  value: number;
}

export interface BetParticipant {
  username: string;
  walletAddress: string;
  selectedCompetitorID: string;
}

export interface AIPrediction {
  reason: string;
  confidence?: number;
  recommendation?: string;
}

export interface Bet {
  id: string;
  matchID: string;
  creator: BetParticipant;
  acceptor?: BetParticipant;
  amount: BetAmount;
  selectedCompetitorID: string;
  status: 'open' | 'accepted' | 'resolved' | 'cancelled';
  winner?: BetParticipant;
  aiPrediction?: AIPrediction;
  nftID?: string;
}

export interface BetMetadata {
  bet: Bet;
  match: Match;
  league: League;
  matchCompetitors: Record<string, Competitor>;
}

// Database-specific types
export interface DatabaseBet {
  id: string;
  creator: string;
  acceptor?: string;
  amount: number;
  currency: string;
  competitor: string;
  status: BetStatus;
  winner?: string;
  aiPrediction?: AIPrediction;
  nftID?: string;
  matchID: string;
  createdDateUTC: string;
  lastUpdatedDateUTC: string;
  isPublic: boolean;
  data: BetMetadata;
  // Additional properties used in components
  creator_username: string;
  acceptor_username?: string;
  created_date_utc: string;
  last_updated_date_utc: string;
}

export type BetStatus = 'open' | 'accepted' | 'resolved' | 'cancelled';

// Username generation types
export interface UsernameWords {
  adjectives: string[];
  nouns: string[];
}

export interface User {
  walletAddress: string;
  username: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  type: 'text' | 'voice';
  timestamp: Date;
  isUser: boolean;
}

export interface ChatError {
  id: string;
  code: ChatErrorCode;
  message: string;
  timestamp: Date;
}

export enum ChatErrorCode {
  USER_NOT_AUTHENTICATED = 'USER_NOT_AUTHENTICATED',
  BACKEND_INVALID_RESPONSE = 'BACKEND_INVALID_RESPONSE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}