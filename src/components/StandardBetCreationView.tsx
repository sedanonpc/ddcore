import React, { useState } from 'react';
import { Match } from '../types';
import { matchDataService } from '../utils/matchData';
import '../styles/cyberpunk.css';

interface StandardBetCreationViewProps {
  match: Match;
  onCreateBet: (creatorSelection: string, amount: string) => Promise<void>;
  isCreating: boolean;
}

/**
 * StandardBetCreationView Component
 * Bet creation form for 1v1 sports (NBA, FIFA, WWE)
 * Shows two competitor buttons and bet amount input
 */
const StandardBetCreationView: React.FC<StandardBetCreationViewProps> = ({
  match,
  onCreateBet,
  isCreating
}) => {
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>('');
  const [betAmount, setBetAmount] = useState<string>('');
  const [isValidAmount, setIsValidAmount] = useState(false);

  // Get match data
  const league = matchDataService.getLeague(match.leagueID);
  const competitors = matchDataService.getMatchCompetitors(match.id);
  const competitorList = Object.values(competitors);
  const betQuestion = matchDataService.getBetQuestion(match.id);
  const formattedDate = matchDataService.getFormattedMatchDate(match.id);

  /**
   * Handle bet amount change and validation
   */
  const handleAmountChange = (value: string) => {
    setBetAmount(value);
    
    // Validate amount (must be positive number)
    const numValue = parseFloat(value);
    setIsValidAmount(!isNaN(numValue) && numValue > 0);
  };

  /**
   * Handle competitor selection
   */
  const handleCompetitorSelect = (competitorId: string) => {
    setSelectedCompetitor(competitorId);
  };

  /**
   * Handle bet creation submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompetitor || !isValidAmount) {
      return;
    }

    await onCreateBet(selectedCompetitor, betAmount);
  };

  /**
   * Check if form is valid for submission
   */
  const isFormValid = selectedCompetitor && isValidAmount && !isCreating;

  return (
    <div className="standard-bet-creation">
      {/* Match Information */}
      <div 
        className="match-info mb-lg"
        style={{
          background: 'var(--bg-tertiary)',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-primary)'
        }}
      >
        {/* League */}
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
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm)'
              }}
            />
            <span 
              style={{
                color: 'var(--text-accent)',
                fontSize: '1rem',
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

        {/* Match Details */}
        <div 
          className="match-details"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-xs)',
            fontSize: '0.875rem',
            color: 'var(--text-muted)'
          }}
        >
          <div>
            <span style={{ fontWeight: '500' }}>Venue: </span>
            {match.location.title}
          </div>
          <div>
            <span style={{ fontWeight: '500' }}>Date: </span>
            {formattedDate}
          </div>
        </div>
      </div>

      {/* Bet Creation Form */}
      <form onSubmit={handleSubmit}>
        {/* Question */}
        <div className="bet-question mb-lg">
          <h3 
            style={{
              color: 'var(--text-accent)',
              textAlign: 'center',
              fontSize: '1.25rem'
            }}
          >
            {betQuestion}
          </h3>
        </div>

        {/* Competitor Selection */}
        <div className="competitor-selection mb-lg">
          <div 
            className="competitors-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--spacing-md)'
            }}
          >
            {competitorList.map(competitor => (
              <button
                key={competitor.id}
                type="button"
                onClick={() => handleCompetitorSelect(competitor.id)}
                disabled={isCreating}
                className={`competitor-button ${
                  selectedCompetitor === competitor.id ? 'selected' : ''
                }`}
                style={{
                  background: selectedCompetitor === competitor.id 
                    ? 'var(--gradient-primary)' 
                    : 'var(--bg-secondary)',
                  border: `2px solid ${
                    selectedCompetitor === competitor.id 
                      ? 'var(--accent-cyan)' 
                      : 'var(--border-primary)'
                  }`,
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--spacing-lg)',
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  transition: 'all var(--transition-normal)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--spacing-md)'
                }}
              >
                <img
                  src={competitor.imageURL}
                  alt={competitor.name}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: 'var(--radius-md)'
                  }}
                />
                <div>
                  <div 
                    style={{
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      marginBottom: 'var(--spacing-xs)'
                    }}
                  >
                    {competitor.abbreviation}
                  </div>
                  <div 
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      textAlign: 'center'
                    }}
                  >
                    {competitor.name}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bet Amount */}
        <div className="bet-amount mb-lg">
          <label className="form-label">
            Bet Amount ({process.env.REACT_APP_DEFAULT_CURRENCY || 'CORE'})
          </label>
          <input
            type="number"
            step="0.0001"
            min="0"
            placeholder="Enter bet amount"
            value={betAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            disabled={isCreating}
            className="form-input"
            style={{
              fontSize: '1.125rem',
              textAlign: 'center'
            }}
          />
          {betAmount && !isValidAmount && (
            <p 
              style={{
                color: 'var(--accent-red)',
                fontSize: '0.875rem',
                marginTop: 'var(--spacing-xs)',
                margin: 0
              }}
            >
              Please enter a valid amount greater than 0
            </p>
          )}
        </div>

        {/* AI Prediction Box */}
        <div 
          className="ai-prediction mb-lg"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-lg)'
          }}
        >
          <h4 
            style={{
              color: 'var(--text-accent)',
              marginBottom: 'var(--spacing-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)'
            }}
          >
            <span>🤖</span>
            AI Prediction
          </h4>
          <div 
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              fontStyle: 'italic'
            }}
          >
            [TODO] AI prediction will be displayed here
          </div>
        </div>

        {/* Create Bet Button */}
        <button
          type="submit"
          disabled={!isFormValid}
          className="btn btn-primary btn-large w-full glow-strong"
          style={{
            opacity: isFormValid ? 1 : 0.5,
            cursor: isFormValid ? 'pointer' : 'not-allowed'
          }}
        >
          {isCreating ? (
            <>
              <span className="loading-spinner" style={{ marginRight: 'var(--spacing-sm)' }} />
              Creating Bet...
            </>
          ) : (
            'DARE to bet!'
          )}
        </button>
      </form>

      {/* Mobile styles are handled in the cyberpunk.css file */}
    </div>
  );
};

export default StandardBetCreationView;
