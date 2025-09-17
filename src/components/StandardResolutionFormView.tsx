import React, { useState } from 'react';
import { Match, DatabaseBet, Competitor } from '../types';
import { matchDataService } from '../utils/matchData';
import '../styles/cyberpunk.css';

interface StandardResolutionFormViewProps {
  match: Match;
  acceptedBets: DatabaseBet[];
  onResolveMatch: (winnerCompetitorId: string) => Promise<void>;
  isResolving: boolean;
}

/**
 * StandardResolutionFormView Component
 * Form for resolving 1v1 matches (non-F1) using simple winner selection
 * Allows admin to select which competitor won the match
 * The loser is automatically determined, making this simpler than F1 ranking resolution
 */
const StandardResolutionFormView: React.FC<StandardResolutionFormViewProps> = ({
  match,
  acceptedBets,
  onResolveMatch,
  isResolving
}) => {
  // Get all competitors for this match (should be exactly 2 for 1v1 matches)
  const allCompetitorsInMatch = matchDataService.getMatchCompetitors(match.id);
  const competitorsList = Object.values(allCompetitorsInMatch);
  
  // State to track which competitor was selected as the winner
  const [selectedWinnerCompetitorId, setSelectedWinnerCompetitorId] = useState<string>('');
  
  // State to track form validation
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * Handle winner selection change
   * Clears any validation errors when a valid selection is made
   */
  const handleWinnerSelectionChange = (competitorId: string) => {
    setSelectedWinnerCompetitorId(competitorId);
    
    // Clear validation error when a winner is selected
    if (competitorId && validationError) {
      setValidationError(null);
    }
  };

  /**
   * Get the competitor that was not selected as winner (the loser)
   * Used for preview display to show both winner and loser
   */
  const getLoserCompetitor = (): Competitor | null => {
    if (!selectedWinnerCompetitorId) return null;
    
    const loserCompetitorId = competitorsList.find(
      competitor => competitor.id !== selectedWinnerCompetitorId
    )?.id;
    
    return loserCompetitorId ? allCompetitorsInMatch[loserCompetitorId] : null;
  };

  /**
   * Handle form submission to resolve the match
   * Validates that a winner has been selected before proceeding
   */
  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that a winner has been selected
    if (!selectedWinnerCompetitorId) {
      setValidationError('Please select the match winner before resolving.');
      return;
    }
    
    // Clear any existing validation errors
    setValidationError(null);
    
    // Proceed with match resolution using the selected winner
    await onResolveMatch(selectedWinnerCompetitorId);
  };

  /**
   * Check if the form is ready for submission
   * Requires winner selected and not currently resolving
   */
  const canSubmitResolution = selectedWinnerCompetitorId && !isResolving;

  // Get winner and loser for preview display
  const selectedWinnerCompetitor = selectedWinnerCompetitorId ? allCompetitorsInMatch[selectedWinnerCompetitorId] : null;
  const loserCompetitor = getLoserCompetitor();

  return (
    <div className="standard-resolution-form">
      {/* Header with match information */}
      <div 
        className="standard-header mb-lg"
        style={{
          background: 'var(--bg-tertiary)',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-primary)'
        }}
      >
        <h2 className="text-glow mb-md">Match Results - Step 2</h2>
        <div className="match-details">
          <h3 style={{ color: 'var(--text-accent)', marginBottom: 'var(--spacing-sm)' }}>
            {match.title}
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
            {match.subtitle}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Select the winner of this match. This will determine the outcomes 
            of all {acceptedBets.length} accepted bet{acceptedBets.length !== 1 ? 's' : ''} for this match.
          </p>
        </div>
      </div>

      {/* Winner selection form */}
      <form onSubmit={handleSubmitResolution}>
        <div 
          className="winner-selection card mb-lg"
          style={{ padding: 'var(--spacing-xl)' }}
        >
          <h3 style={{ 
            color: 'var(--text-accent)', 
            marginBottom: 'var(--spacing-lg)',
            textAlign: 'center'
          }}>
            Select Match Winner
          </h3>

          {/* Competitor selection as radio buttons for better UX */}
          <div 
            className="competitor-options"
            style={{
              display: 'grid',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-lg)'
            }}
          >
            {competitorsList.map(competitor => (
              <label
                key={competitor.id}
                className="competitor-option"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-md)',
                  padding: 'var(--spacing-lg)',
                  background: selectedWinnerCompetitorId === competitor.id ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                  border: selectedWinnerCompetitorId === competitor.id ? '2px solid var(--accent-green)' : '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  cursor: isResolving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isResolving ? 0.7 : 1
                }}
              >
                <input
                  type="radio"
                  name="matchWinner"
                  value={competitor.id}
                  checked={selectedWinnerCompetitorId === competitor.id}
                  onChange={(e) => handleWinnerSelectionChange(e.target.value)}
                  disabled={isResolving}
                  style={{
                    width: '20px',
                    height: '20px',
                    accentColor: 'var(--accent-green)'
                  }}
                />
                
                {/* Competitor image if available */}
                <img
                  src={competitor.imageURL}
                  alt={competitor.name}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-sm)',
                    objectFit: 'cover'
                  }}
                />
                
                {/* Competitor details */}
                <div className="competitor-details" style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: '600', 
                    color: 'var(--text-primary)',
                    fontSize: '1.125rem',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    {competitor.name}
                  </div>
                  <div style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem'
                  }}>
                    {competitor.abbreviation}
                  </div>
                </div>
                
                {/* Winner indicator */}
                {selectedWinnerCompetitorId === competitor.id && (
                  <div style={{
                    background: 'var(--accent-green)',
                    color: 'var(--text-primary)',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    WINNER
                  </div>
                )}
              </label>
            ))}
          </div>

          {/* Validation error display */}
          {validationError && (
            <div 
              className="validation-error mb-lg"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--accent-red)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-md)',
                color: 'var(--accent-red)',
                textAlign: 'center'
              }}
            >
              {validationError}
            </div>
          )}

          {/* Match result preview when winner is selected */}
          {selectedWinnerCompetitor && loserCompetitor && (
            <div 
              className="match-result-preview mb-lg"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-lg)'
              }}
            >
              <h4 style={{ 
                color: 'var(--text-accent)', 
                marginBottom: 'var(--spacing-md)',
                textAlign: 'center'
              }}>
                Match Result Preview
              </h4>
              
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  gap: 'var(--spacing-lg)',
                  flexWrap: 'wrap'
                }}
              >
                {/* Winner display */}
                <div 
                  style={{
                    textAlign: 'center',
                    padding: 'var(--spacing-lg)',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '2px solid var(--accent-green)',
                    minWidth: '150px'
                  }}
                >
                  <div style={{ 
                    color: 'var(--accent-green)', 
                    fontSize: '0.75rem', 
                    fontWeight: '600',
                    marginBottom: 'var(--spacing-xs)' 
                  }}>
                    WINNER
                  </div>
                  <div style={{ 
                    fontWeight: '600', 
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    {selectedWinnerCompetitor.abbreviation}
                  </div>
                  <div style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem'
                  }}>
                    {selectedWinnerCompetitor.name}
                  </div>
                </div>
                
                {/* VS indicator */}
                <div style={{ 
                  color: 'var(--text-muted)',
                  fontSize: '1.25rem',
                  fontWeight: '600'
                }}>
                  VS
                </div>
                
                {/* Loser display */}
                <div 
                  style={{
                    textAlign: 'center',
                    padding: 'var(--spacing-lg)',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '2px solid var(--accent-red)',
                    minWidth: '150px'
                  }}
                >
                  <div style={{ 
                    color: 'var(--accent-red)', 
                    fontSize: '0.75rem', 
                    fontWeight: '600',
                    marginBottom: 'var(--spacing-xs)' 
                  }}>
                    LOSER
                  </div>
                  <div style={{ 
                    fontWeight: '600', 
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    {loserCompetitor.abbreviation}
                  </div>
                  <div style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem'
                  }}>
                    {loserCompetitor.name}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resolution submission button */}
        <button
          type="submit"
          disabled={!canSubmitResolution}
          className="btn btn-primary btn-large w-full glow-strong"
          style={{
            opacity: canSubmitResolution ? 1 : 0.5,
            cursor: canSubmitResolution ? 'pointer' : 'not-allowed'
          }}
        >
          {isResolving ? (
            <>
              <span className="loading-spinner" style={{ marginRight: 'var(--spacing-sm)' }} />
              Resolving {acceptedBets.length} Bet{acceptedBets.length !== 1 ? 's' : ''}...
            </>
          ) : (
            `Resolve Match (${acceptedBets.length} bet${acceptedBets.length !== 1 ? 's' : ''})`
          )}
        </button>
      </form>
    </div>
  );
};

export default StandardResolutionFormView;
