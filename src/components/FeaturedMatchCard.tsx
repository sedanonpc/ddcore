import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Match, League, Competitor } from '../types';
import { matchDataService } from '../utils/matchData';

interface FeaturedMatchCardProps {
  match: Match;
  league: League;
  competitors: Record<string, Competitor>;
  allUpcomingMatches?: Match[];
}

/**
 * FeaturedMatchCard Component
 * Displays the next upcoming match in a prominent card format
 * Follows the red color scheme and cyberpunk design
 */
const FeaturedMatchCard: React.FC<FeaturedMatchCardProps> = ({ match, league, competitors, allUpcomingMatches = [] }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const formattedDate = matchDataService.getFormattedMatchDate(match.id);
  const matchStatus = matchDataService.getMatchStatus(match.id);
  
  // Get competitor names for display
  const competitorNames = match.competitorIDs.map(id => {
    const competitor = competitors[id];
    return competitor ? competitor.name : 'Unknown';
  });

  const getStatusColor = () => {
    switch (matchStatus) {
      case 'live':
        return '#DB0004';
      case 'upcoming':
        return '#f59e0b';
      case 'completed':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (matchStatus) {
      case 'live':
        return 'LIVE';
      case 'upcoming':
        return 'UPCOMING';
      case 'completed':
        return 'COMPLETED';
      default:
        return 'UNKNOWN';
    }
  };

  const handleMatchClick = (matchId: string) => {
    navigate(`/matches/${matchId}`);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="upcoming-matches-card" style={{
      maxWidth: 'min(90vw, 720px)',
      width: '100%',
      margin: '0 auto',
      position: 'relative',
      height: '36px' // 1:10 ratio with 720px width
    }}>
      {/* Red Header Bar */}
      <div className="matches-header" style={{
        background: '#DB0004',
        padding: '4px 12px',
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px',
        height: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start'
      }}>
        <span style={{
          color: '#ffffff',
          fontSize: '0.6rem',
          fontWeight: 400,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          UPCOMING
        </span>
      </div>

      {/* Black Content Area with Red Border */}
      <div className="matches-content" style={{
        background: '#000000',
        border: '1px solid #DB0004',
        borderTop: 'none',
        borderBottomLeftRadius: '4px',
        borderBottomRightRadius: '4px',
        padding: '4px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        height: '24px'
      }}>
        {/* Left Side - Match Details */}
        <div className="match-details" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
          overflow: 'hidden',
          marginRight: allUpcomingMatches.length > 1 ? '40px' : '0' // Reserve space for dropdown
        }}>
          <span style={{
            color: '#ffffff',
            fontSize: '0.7rem',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {match.title}
          </span>
          <span style={{
            color: '#ffffff',
            fontSize: '0.6rem',
            opacity: 0.7,
            whiteSpace: 'nowrap'
          }}>
            {competitorNames.slice(0, 2).join(' VS ')}
          </span>
        </div>

        {/* Right Side - Watch Live Button */}
        <div className="watch-live-section" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginRight: allUpcomingMatches.length > 1 ? '20px' : '0' // Reserve space for dropdown
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#DB0004',
            animation: 'pulse 2s infinite'
          }}></div>
          <button
            onClick={() => handleMatchClick(match.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.6rem',
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '2px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(219, 0, 4, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            LIVE
          </button>
        </div>

        {/* Dropdown Arrow */}
        {allUpcomingMatches.length > 1 && (
          <button
            onClick={toggleDropdown}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.8rem',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '2px',
              transition: 'background-color 0.2s',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(219, 0, 4, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {isDropdownOpen ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Collapsible Dropdown for Other Matches */}
      {isDropdownOpen && allUpcomingMatches.length > 1 && (
        <div className="matches-dropdown" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#000000',
          border: '1px solid #DB0004',
          borderTop: 'none',
          borderBottomLeftRadius: '4px',
          borderBottomRightRadius: '4px',
          zIndex: 100,
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {allUpcomingMatches
            .filter(upcomingMatch => upcomingMatch.id !== match.id)
            .slice(0, 5) // Show max 5 other matches
            .map((upcomingMatch) => {
              const upcomingCompetitors = matchDataService.getMatchCompetitors(upcomingMatch.id);
              const upcomingCompetitorNames = upcomingMatch.competitorIDs.map(id => {
                const competitor = upcomingCompetitors[id];
                return competitor ? competitor.name : 'Unknown';
              });
              
              return (
                <div
                  key={upcomingMatch.id}
                  onClick={() => handleMatchClick(upcomingMatch.id)}
                  style={{
                    padding: '6px 12px',
                    borderBottom: '1px solid rgba(219, 0, 4, 0.2)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(219, 0, 4, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{
                    color: '#ffffff',
                    fontSize: '0.6rem',
                    fontWeight: 400,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px'
                  }}>
                    {upcomingMatch.title}
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '0.5rem',
                    opacity: 0.7
                  }}>
                    {upcomingCompetitorNames.slice(0, 2).join(' VS ')}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default FeaturedMatchCard;
