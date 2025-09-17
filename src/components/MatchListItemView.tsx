import React from 'react';
import { Match, League, Competitor } from '../types';
import { matchDataService } from '../utils/matchData';
import '../styles/cyberpunk.css';

interface MatchListItemViewProps {
  match: Match;
  onSelect: () => void;
}

/**
 * MatchListItemView Component
 * Individual match item in the match list
 * Displays match details and allows selection for bet creation
 */
const MatchListItemView: React.FC<MatchListItemViewProps> = ({ match, onSelect }) => {
  // Get match-related data
  const league = matchDataService.getLeague(match.leagueID);
  const competitors = matchDataService.getMatchCompetitors(match.id);
  const competitorList = Object.values(competitors);
  const matchStatus = matchDataService.getMatchStatus(match.id);
  const formattedDate = matchDataService.getFormattedMatchDate(match.id);

  /**
   * Get status color based on match status
   */
  const getStatusColor = () => {
    switch (matchStatus) {
      case 'live':
        return 'var(--accent-red)';
      case 'completed':
        return 'var(--text-muted)';
      default:
        return 'var(--accent-green)';
    }
  };

  /**
   * Get status text
   */
  const getStatusText = () => {
    switch (matchStatus) {
      case 'live':
        return 'LIVE';
      case 'completed':
        return 'COMPLETED';
      default:
        return 'UPCOMING';
    }
  };

  /**
   * Check if betting is available for this match
   */
  const isBettingAvailable = matchStatus === 'upcoming';

  return (
    <div 
      className="match-item card"
      style={{
        cursor: isBettingAvailable ? 'pointer' : 'default',
        opacity: isBettingAvailable ? 1 : 0.7,
        position: 'relative'
      }}
      onClick={isBettingAvailable ? onSelect : undefined}
    >
      {/* Match Status Badge */}
      <div 
        className="match-status"
        style={{
          position: 'absolute',
          top: 'var(--spacing-md)',
          right: 'var(--spacing-md)',
          background: getStatusColor(),
          color: matchStatus === 'completed' ? 'var(--bg-primary)' : 'var(--text-primary)',
          padding: 'var(--spacing-xs) var(--spacing-sm)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          fontWeight: '600',
          zIndex: 2
        }}
      >
        {getStatusText()}
      </div>

      {/* League Info */}
      {league && (
        <div 
          className="league-info mb-md"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)'
          }}
        >
          <img
            src={league.imageURL}
            alt={league.name}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: 'var(--radius-sm)'
            }}
          />
          <span 
            style={{
              color: 'var(--text-accent)',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            {league.name}
          </span>
        </div>
      )}

      {/* Match Title */}
      <h3 className="match-title mb-sm">
        {match.title}
      </h3>

      {/* Match Subtitle */}
      <p 
        className="match-subtitle mb-md"
        style={{
          color: 'var(--text-secondary)',
          fontSize: '1rem'
        }}
      >
        {match.subtitle}
      </p>

      {/* Competitors */}
      <div 
        className="competitors mb-md"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--spacing-sm)'
        }}
      >
        {competitorList.map((competitor, index) => (
          <div
            key={competitor.id}
            className="competitor"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              background: 'var(--bg-tertiary)',
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-primary)'
            }}
          >
            <img
              src={competitor.imageURL}
              alt={competitor.name}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: 'var(--radius-sm)'
              }}
            />
            <span 
              style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}
            >
              {competitor.abbreviation}
            </span>
          </div>
        ))}
      </div>

      {/* Match Details */}
      <div 
        className="match-details mb-md"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-xs)',
          fontSize: '0.875rem',
          color: 'var(--text-muted)'
        }}
      >
        {/* Venue */}
        <div className="venue">
          <span style={{ fontWeight: '500' }}>Venue: </span>
          {match.location.title}
        </div>

        {/* Schedule */}
        <div className="schedule">
          <span style={{ fontWeight: '500' }}>Date: </span>
          {formattedDate}
        </div>

        {/* Conference (if applicable) */}
        {match.conference && (
          <div className="conference">
            <span style={{ fontWeight: '500' }}>Conference: </span>
            {match.conference}
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="match-actions">
        {isBettingAvailable ? (
          <button
            className="btn btn-primary w-full"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            Create Bet
          </button>
        ) : (
          <div 
            style={{
              textAlign: 'center',
              padding: 'var(--spacing-sm)',
              color: 'var(--text-muted)',
              fontSize: '0.875rem'
            }}
          >
            {matchStatus === 'live' ? 'Match in progress' : 'Betting closed'}
          </div>
        )}
      </div>

      {/* Special styling for F1 matches */}
      {match.leagueID === 'f1' && (
        <div 
          className="f1-indicator"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, var(--accent-red), var(--accent-orange), var(--accent-red))',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
          }}
        />
      )}
    </div>
  );
};

export default MatchListItemView;


