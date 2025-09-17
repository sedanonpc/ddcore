import React, { useState } from 'react';
import { Match } from '../types';
import { matchDataService } from '../utils/matchData';
import '../styles/cyberpunk.css';

interface F1BetCreationViewProps {
  match: Match;
  onCreateBet: (creatorSelection: string, amount: string, acceptorSelection?: string) => Promise<void>;
  isCreating: boolean;
}

/**
 * F1BetCreationView Component
 * Specialized bet creation form for F1 races (1-vs-many format)
 * Shows two dropdowns for selecting higher-ranking and opponent racers
 */
const F1BetCreationView: React.FC<F1BetCreationViewProps> = ({
  match,
  onCreateBet,
  isCreating
}) => {
  const [creatorSelection, setCreatorSelection] = useState<string>('');
  const [acceptorSelection, setAcceptorSelection] = useState<string>('');
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
   * Handle creator selection change
   */
  const handleCreatorSelectionChange = (competitorId: string) => {
    setCreatorSelection(competitorId);
    
    // If acceptor selection is the same, clear it
    if (acceptorSelection === competitorId) {
      setAcceptorSelection('');
    }
  };

  /**
   * Handle acceptor selection change
   */
  const handleAcceptorSelectionChange = (competitorId: string) => {
    setAcceptorSelection(competitorId);
    
    // If creator selection is the same, clear it
    if (creatorSelection === competitorId) {
      setCreatorSelection('');
    }
  };

  /**
   * Get available options for acceptor dropdown (exclude creator selection)
   */
  const getAcceptorOptions = () => {
    return competitorList.filter(competitor => competitor.id !== creatorSelection);
  };

  /**
   * Get available options for creator dropdown (exclude acceptor selection)
   */
  const getCreatorOptions = () => {
    return competitorList.filter(competitor => competitor.id !== acceptorSelection);
  };

  /**
   * Handle bet creation submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!creatorSelection || !acceptorSelection || !isValidAmount) {
      return;
    }

    await onCreateBet(creatorSelection, betAmount, acceptorSelection);
  };

  /**
   * Check if form is valid for submission
   */
  const isFormValid = creatorSelection && acceptorSelection && isValidAmount && !isCreating;

  return (
    <div className="f1-bet-creation">
      {/* Match Information */}
      <div 
        className="match-info mb-lg"
        style={{
          background: 'var(--bg-tertiary)',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-primary)',
          position: 'relative'
        }}
      >
        {/* F1 Racing Stripe */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, var(--accent-red), var(--accent-orange), var(--accent-red))',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0'
          }}
        />

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
            <span style={{ fontWeight: '500' }}>Circuit: </span>
            {match.location.title}
          </div>
          <div>
            <span style={{ fontWeight: '500' }}>Race Date: </span>
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
          <p 
            style={{
              color: 'var(--text-secondary)',
              textAlign: 'center',
              fontSize: '0.875rem',
              marginTop: 'var(--spacing-sm)'
            }}
          >
            Select which racer will finish higher in the race
          </p>
        </div>

        {/* Racer Selection */}
        <div className="racer-selection mb-lg">
          {/* Creator Selection (Your Pick) */}
          <div className="form-group">
            <label className="form-label">
              Your Pick (Higher Ranking Racer)
            </label>
            <select
              value={creatorSelection}
              onChange={(e) => handleCreatorSelectionChange(e.target.value)}
              disabled={isCreating}
              className="form-select"
            >
              <option value="">Select your racer</option>
              {getCreatorOptions().map(competitor => (
                <option key={competitor.id} value={competitor.id}>
                  {competitor.name} ({competitor.abbreviation})
                </option>
              ))}
            </select>
          </div>

          {/* VS Indicator */}
          <div 
            style={{
              textAlign: 'center',
              padding: 'var(--spacing-md) 0',
              color: 'var(--text-accent)',
              fontSize: '1.125rem',
              fontWeight: '600'
            }}
          >
            VS
          </div>

          {/* Acceptor Selection (Opponent) */}
          <div className="form-group">
            <label className="form-label">
              Opponent (Lower Ranking Racer)
            </label>
            <select
              value={acceptorSelection}
              onChange={(e) => handleAcceptorSelectionChange(e.target.value)}
              disabled={isCreating || !creatorSelection}
              className="form-select"
            >
              <option value="">Select opponent racer</option>
              {getAcceptorOptions().map(competitor => (
                <option key={competitor.id} value={competitor.id}>
                  {competitor.name} ({competitor.abbreviation})
                </option>
              ))}
            </select>
            {!creatorSelection && (
              <p 
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  marginTop: 'var(--spacing-xs)'
                }}
              >
                Select your pick first
              </p>
            )}
          </div>
        </div>

        {/* Selection Preview */}
        {creatorSelection && acceptorSelection && (
          <div 
            className="selection-preview mb-lg"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-lg)'
            }}
          >
            <h4 
              style={{
                color: 'var(--text-accent)',
                marginBottom: 'var(--spacing-md)',
                textAlign: 'center'
              }}
            >
              Your Bet Preview
            </h4>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--spacing-lg)',
                flexWrap: 'wrap'
              }}
            >
              <div 
                style={{
                  textAlign: 'center',
                  padding: 'var(--spacing-md)',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--accent-green)'
                }}
              >
                <div style={{ color: 'var(--accent-green)', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                  YOUR PICK
                </div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  {competitors[creatorSelection]?.abbreviation}
                </div>
              </div>
              
              <div style={{ color: 'var(--text-accent)', fontSize: '1.25rem' }}>
                will rank higher than
              </div>
              
              <div 
                style={{
                  textAlign: 'center',
                  padding: 'var(--spacing-md)',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--accent-red)'
                }}
              >
                <div style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                  OPPONENT
                </div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  {competitors[acceptorSelection]?.abbreviation}
                </div>
              </div>
            </div>
          </div>
        )}

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
            AI Race Analysis
          </h4>
          <div 
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              fontStyle: 'italic'
            }}
          >
            [TODO] AI prediction and race analysis will be displayed here
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
    </div>
  );
};

export default F1BetCreationView;


