import React from 'react';
import { DatabaseBet } from '../types';
import { matchDataService } from '../utils/matchData';
import { blockchainService } from '../services/blockchain';
import '../styles/cyberpunk.css';

interface BetListItemViewProps {
  bet: DatabaseBet;
  onSelect: () => void;
}

/**
 * BetListItemView Component
 * Individual bet item in the bet list
 * Displays bet details and allows selection for acceptance
 */
const BetListItemView: React.FC<BetListItemViewProps> = ({ bet, onSelect }) => {
  const { data } = bet;
  const { match, league, matchCompetitors, bet: betData } = data;
  
  // Get current user
  const currentUser = blockchainService.getCurrentUser();
  
  // Check if current user is the bet creator
  const isCreator = currentUser?.username === bet.creator_username;
  
  // Check if bet can be accepted (is open and user is not creator)
  const canAcceptBet = bet.status === 'open' && !isCreator;
  
  // Get creator's selected competitor
  const creatorCompetitor = matchCompetitors[betData.creator.selectedCompetitorID];
  
  // Get formatted date
  const createdDate = new Date(bet.created_date_utc);
  const formattedCreatedDate = createdDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Get match date
  const matchDate = new Date(match.scheduledDateInUTC);
  const formattedMatchDate = matchDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Check if this is an F1 bet
  const isF1Bet = matchDataService.isF1Match(match.id);

  // Get bet question text
  const betQuestion = matchDataService.getBetQuestion(match.id);

  // Get status badge properties
  const getStatusBadge = () => {
    switch (bet.status) {
      case 'open':
        return {
          text: 'OPEN',
          color: 'var(--accent-green)',
          textColor: 'var(--text-primary)'
        };
      case 'accepted':
        return {
          text: 'ACCEPTED',
          color: 'var(--accent-orange)',
          textColor: 'var(--text-primary)'
        };
      case 'resolved':
        return {
          text: 'RESOLVED',
          color: 'var(--accent-blue)',
          textColor: 'var(--text-primary)'
        };
      default:
        return {
          text: String(bet.status).toUpperCase(),
          color: 'var(--text-muted)',
          textColor: 'var(--text-primary)'
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div 
      className="bet-item-banner-card"
      style={{
        maxWidth: 'min(90vw, 720px)',
        width: '100%',
        cursor: canAcceptBet ? 'pointer' : 'default',
        position: 'relative',
        opacity: canAcceptBet ? 1 : 0.8
      }}
      onClick={canAcceptBet ? onSelect : undefined}
    >
      {/* Red Header Bar */}
      <div style={{
        background: '#DB0004',
        padding: '12px 16px',
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)'
        }}>
          <img
            src={league.imageURL}
            alt={league.name}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: 'var(--radius-sm)'
            }}
          />
          <span style={{
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {league.name} BET
          </span>
        </div>
        
        <div 
          style={{
            background: statusBadge.color,
            color: statusBadge.textColor,
            padding: '4px 8px',
            borderRadius: '2px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}
        >
          {statusBadge.text}
        </div>
      </div>

      {/* Black Content Area */}
      <div style={{
        background: '#000000',
        border: '1px solid #DB0004',
        borderTop: 'none',
        borderBottomLeftRadius: '4px',
        borderBottomRightRadius: '4px',
        padding: '16px'
      }}>
        {/* Match Info */}
        <div className="match-info mb-md">
          <h3 
            className="match-title mb-xs"
            style={{ 
              fontSize: '1.125rem',
              color: 'var(--text-primary)',
              margin: '0 0 var(--spacing-xs) 0'
            }}
          >
            {match.title}
          </h3>
          <p 
            className="match-subtitle"
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              margin: 0
            }}
          >
            {match.subtitle}
          </p>
        </div>

        {/* Bet Details */}
        <div 
          className="bet-details mb-md"
          style={{
            background: 'var(--bg-tertiary)',
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)'
          }}
        >
          {/* Bet Amount */}
          <div 
            className="bet-amount mb-md"
            style={{
              textAlign: 'center',
              padding: 'var(--spacing-md)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-accent)'
            }}
          >
            <div 
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: 'var(--text-accent)',
                marginBottom: 'var(--spacing-xs)'
              }}
            >
              {betData.amount.value} {betData.amount.currency}
            </div>
            <div 
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
              }}
            >
              Bet Amount
            </div>
          </div>

          {/* Creator's Pick */}
          <div className="creator-pick mb-md">
            <div 
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-muted)',
                marginBottom: 'var(--spacing-xs)'
              }}
            >
              {bet.creator_username} picked:
            </div>
            
            {creatorCompetitor && (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  padding: 'var(--spacing-sm)',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-primary)'
                }}
              >
                <img
                  src={creatorCompetitor.imageURL}
                  alt={creatorCompetitor.name}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: 'var(--radius-sm)'
                  }}
                />
                <div>
                  <div 
                    style={{
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  >
                    {creatorCompetitor.abbreviation}
                  </div>
                  <div 
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {creatorCompetitor.name}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Question */}
          <div 
            className="bet-question"
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-accent)',
              fontWeight: '500',
              textAlign: 'center'
            }}
          >
            {betQuestion}
          </div>
        </div>

        {/* AI Prediction */}
        <div 
          className="ai-prediction mb-md"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-md)'
          }}
        >
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              marginBottom: 'var(--spacing-sm)'
            }}
          >
            <span style={{ fontSize: '0.875rem' }}>🤖</span>
            <span 
              style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'var(--text-accent)'
              }}
            >
              AI Prediction
            </span>
          </div>
          <div 
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              fontStyle: 'italic'
            }}
          >
            {betData.aiPrediction?.reason || '[TODO] AI prediction'}
          </div>
        </div>

        {/* Match & Bet Info */}
        <div 
          className="additional-info mb-md"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}
        >
          <div>
            <span style={{ fontWeight: '500' }}>Match: </span>
            {formattedMatchDate}
          </div>
          <div>
            <span style={{ fontWeight: '500' }}>Created: </span>
            {formattedCreatedDate}
          </div>
        </div>

        {/* Accept Button - Only show for open bets and non-creators */}
        {canAcceptBet && (
          <button
            className="btn btn-primary w-full"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            Accept Bet
          </button>
        )}

        {/* Show status message for non-acceptable bets */}
        {!canAcceptBet && (
          <div 
            className="bet-status-message"
            style={{
              textAlign: 'center',
              padding: 'var(--spacing-md)',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-muted)',
              fontSize: '0.875rem'
            }}
          >
            {bet.status !== 'open' 
              ? `This bet is ${bet.status}` 
              : 'You cannot accept your own bet'
            }
          </div>
        )}
      </div>
      
      {/* Special styling for F1 bets */}
      {isF1Bet && (
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

export default BetListItemView;


