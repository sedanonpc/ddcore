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

export interface BetWinner {
  competitorID: string;
  username: string;
  role: 'creator' | 'acceptor';
}

export interface AIPrediction {
  winningCompetitorID: string;
  reason: string;
}

export type BetStatus = 'open' | 'accepted' | 'resolved';

export interface Bet {
  id: string;
  matchID: string;
  creator: BetParticipant;
  amount: BetAmount;
  status: BetStatus;
  acceptor?: BetParticipant;
  winner?: BetWinner;
  aiPrediction?: AIPrediction;
  nftID?: string;
}

export interface BetMetadata {
  bet: Bet;
  match: Match;
  league: League;
  matchCompetitors: Record<string, Competitor>;
}

export interface DatabaseBet {
  id: string;
  match_id: string;
  status: BetStatus;
  created_date_utc: string;
  last_updated_date_utc: string;
  creator_username: string;
  acceptor_username?: string;
  data: BetMetadata;
}

export interface User {
  username: string;
  walletAddress: string;
}

export interface UsernameWords {
  adjectives: string[];
  nouns: string[];
}

// Ethereum/Web3 types
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

