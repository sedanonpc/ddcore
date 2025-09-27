import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Match, League, Competitor } from '../types';

interface FeaturedMatchCardProps {
  match: Match;
  league: League;
  competitors: Record<string, Competitor>;
}

/**
 * FeaturedMatchCard Component
 * Displays the next upcoming F1 match in a simple card format
 * Follows the red color scheme and cyberpunk design
 */
const FeaturedMatchCard: React.FC<FeaturedMatchCardProps> = ({ match, league, competitors }) => {
  const navigate = useNavigate();
  
  // Get competitor names for display
  const competitorNames = match.competitorIDs.map(id => {
    const competitor = competitors[id];
    return competitor ? competitor.name : 'Unknown';
  });

  const handleMatchClick = () => {
    navigate(`/matches/${match.id}`);
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
        {/* Match Details */}
        <div className="match-details" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
          overflow: 'hidden'
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

        {/* Live Indicator */}
        <div className="live-section" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#DB0004',
            animation: 'pulse 2s infinite'
          }}></div>
          <button
            onClick={handleMatchClick}
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
      </div>

    </div>
  );
};

export default FeaturedMatchCard;
