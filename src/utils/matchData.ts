import { MatchData, Match, League, Competitor } from '../types';
import matchDataJson from '../assets/matchData.json';

/**
 * Utility functions for handling match data
 * Provides type-safe access to match information from JSON file
 */
export class MatchDataService {
  private data: MatchData;

  constructor() {
    this.data = matchDataJson as MatchData;
  }

  /**
   * Get all matches in display order with F1 prioritized and completed matches at bottom
   */
  public getAllMatches(): Match[] {
    const allMatches = this.data.matches.orderedIDsForDisplay.map(id => this.data.matches.data[id]);
    
    // Sort matches to prioritize F1 first, then maintain original order within each league
    // Completed matches go to the bottom regardless of league
    return allMatches.sort((a, b) => {
      const aStatus = this.getMatchStatus(a.id);
      const bStatus = this.getMatchStatus(b.id);
      
      // Completed matches go to the bottom
      if (aStatus === 'completed' && bStatus !== 'completed') {
        return 1;
      }
      if (aStatus !== 'completed' && bStatus === 'completed') {
        return -1;
      }
      
      // For non-completed matches, F1 comes first
      if (aStatus !== 'completed' && bStatus !== 'completed') {
        if (a.leagueID === 'f1' && b.leagueID !== 'f1') {
          return -1;
        }
        if (a.leagueID !== 'f1' && b.leagueID === 'f1') {
          return 1;
        }
      }
      
      // For matches within the same status and league, maintain original order
      const aIndex = this.data.matches.orderedIDsForDisplay.indexOf(a.id);
      const bIndex = this.data.matches.orderedIDsForDisplay.indexOf(b.id);
      return aIndex - bIndex;
    });
  }

  /**
   * Get a specific match by ID
   */
  public getMatch(matchId: string): Match | null {
    return this.data.matches.data[matchId] || null;
  }

  /**
   * Get league information for a match
   */
  public getLeague(leagueId: string): League | null {
    return this.data.leagues[leagueId] || null;
  }

  /**
   * Get competitors for a specific league
   */
  public getLeagueCompetitors(leagueId: string): Record<string, Competitor> {
    return this.data.competitors[leagueId] || {};
  }

  /**
   * Get a specific competitor
   */
  public getCompetitor(leagueId: string, competitorId: string): Competitor | null {
    const leagueCompetitors = this.data.competitors[leagueId];
    return leagueCompetitors ? leagueCompetitors[competitorId] || null : null;
  }

  /**
   * Get competitors for a specific match
   */
  public getMatchCompetitors(matchId: string): Record<string, Competitor> {
    const match = this.getMatch(matchId);
    if (!match) return {};

    const leagueCompetitors = this.getLeagueCompetitors(match.leagueID);
    const matchCompetitors: Record<string, Competitor> = {};

    match.competitorIDs.forEach(competitorId => {
      const competitor = leagueCompetitors[competitorId];
      if (competitor) {
        matchCompetitors[competitorId] = competitor;
      }
    });

    return matchCompetitors;
  }

  /**
   * Check if a match is F1 (1-vs-many format)
   */
  public isF1Match(matchId: string): boolean {
    const match = this.getMatch(matchId);
    return match ? match.leagueID === 'f1' : false;
  }

  /**
   * Check if a match is 1v1 format (NBA, FIFA, WWE)
   */
  public is1v1Match(matchId: string): boolean {
    const match = this.getMatch(matchId);
    if (!match) return false;
    
    return ['nba', 'fifa', 'wwe'].includes(match.leagueID) && match.competitorIDs.length === 2;
  }

  /**
   * Get formatted match date
   */
  public getFormattedMatchDate(matchId: string): string {
    const match = this.getMatch(matchId);
    if (!match) return '';

    const date = new Date(match.scheduledDateInUTC);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }

  /**
   * Get match status (upcoming, live, completed)
   */
  public getMatchStatus(matchId: string): 'upcoming' | 'live' | 'completed' {
    const match = this.getMatch(matchId);
    if (!match) return 'upcoming';

    const now = new Date();
    const matchDate = new Date(match.scheduledDateInUTC);
    const matchEndEstimate = new Date(matchDate.getTime() + (3 * 60 * 60 * 1000)); // Assume 3 hours duration

    if (now < matchDate) {
      return 'upcoming';
    } else if (now >= matchDate && now <= matchEndEstimate) {
      return 'live';
    } else {
      return 'completed';
    }
  }

  /**
   * Get question text for bet creation based on sport type
   */
  public getBetQuestion(matchId: string): string {
    const match = this.getMatch(matchId);
    if (!match) return 'Who will win?';

    if (match.leagueID === 'f1') {
      return 'Who will rank higher?';
    } else {
      return 'Who will win?';
    }
  }

  /**
   * Search matches by title or competitors
   */
  public searchMatches(query: string): Match[] {
    const allMatches = this.getAllMatches();
    const lowercaseQuery = query.toLowerCase();

    return allMatches.filter(match => {
      // Search in title and subtitle
      if (match.title.toLowerCase().includes(lowercaseQuery) ||
          match.subtitle.toLowerCase().includes(lowercaseQuery)) {
        return true;
      }

      // Search in competitor names
      const competitors = this.getMatchCompetitors(match.id);
      return Object.values(competitors).some(competitor =>
        competitor.name.toLowerCase().includes(lowercaseQuery) ||
        competitor.abbreviation.toLowerCase().includes(lowercaseQuery)
      );
    });
  }

  /**
   * Get matches by league
   */
  public getMatchesByLeague(leagueId: string): Match[] {
    return this.getAllMatches().filter(match => match.leagueID === leagueId);
  }

  /**
   * Get upcoming matches (next 7 days)
   */
  public getUpcomingMatches(): Match[] {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    return this.getAllMatches().filter(match => {
      const matchDate = new Date(match.scheduledDateInUTC);
      return matchDate >= now && matchDate <= nextWeek;
    });
  }
}

// Export singleton instance
export const matchDataService = new MatchDataService();

