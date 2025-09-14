import React from 'react';
import { DatabaseBet } from '../types';
import { matchDataService } from '../utils/matchData';
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

  return (
    <div 
      className="bet-item card"
      style={{
        cursor: 'pointer',
        position: 'relative'
      }}
      onClick={onSelect}
    >
      {/* Bet Status Badge */}
      <div 
        className="bet-status"
        style={{
          position: 'absolute',
          top: 'var(--spacing-md)',
          right: 'var(--spacing-md)',
          background: 'var(--accent-green)',
          color: 'var(--text-primary)',
          padding: 'var(--spacing-xs) var(--spacing-sm)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          fontWeight: '600',
          zIndex: 2
        }}
      >
        OPEN
      </div>

      {/* League Info */}
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

      {/* Match Info */}
      <div className="match-info mb-md">
        <h3 
          className="match-title mb-xs"
          style={{ fontSize: '1.125rem' }}
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

      {/* Accept Button */}
      <button
        className="btn btn-primary w-full"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        Accept Bet
      </button>

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
