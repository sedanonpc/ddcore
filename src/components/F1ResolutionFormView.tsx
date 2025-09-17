import React, { useState, useEffect } from 'react';
import { Match, DatabaseBet, Competitor } from '../types';
import { matchDataService } from '../utils/matchData';
import '../styles/cyberpunk.css';

interface F1ResolutionFormViewProps {
  match: Match;
  acceptedBets: DatabaseBet[];
  onResolveMatch: (finalRankings: Record<string, number>) => Promise<void>;
  isResolving: boolean;
}

/**
 * F1ResolutionFormView Component
 * Specialized form for resolving F1 races using numbered ranking dropdowns
 * Allows admin to set the final finishing positions (1st, 2nd, 3rd, etc.) for each racer
 * Uses this ranking data to determine winners of F1 bets based on "who ranks higher" logic
 */
const F1ResolutionFormView: React.FC<F1ResolutionFormViewProps> = ({
  match,
  acceptedBets,
  onResolveMatch,
  isResolving
}) => {
  // Get all competitors for this F1 race from match data
  const allCompetitorsInRace = matchDataService.getMatchCompetitors(match.id);
  const competitorsList = Object.values(allCompetitorsInRace);
  const totalPositions = competitorsList.length;

  // State to track which competitor is assigned to each finishing position
  // Key: position number (1, 2, 3, etc.), Value: competitor ID
  const [rankingAssignments, setRankingAssignments] = useState<Record<number, string>>({});
  
  // State to track validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  /**
   * Handle assignment of a competitor to a specific finishing position
   * Ensures no competitor is assigned to multiple positions
   */
  const handlePositionAssignment = (position: number, competitorId: string) => {
    const newAssignments = { ...rankingAssignments };
    
    // If a competitor was previously assigned to this position, remove that assignment
    if (newAssignments[position]) {
      delete newAssignments[position];
    }
    
    // If selecting a new competitor (not empty), assign them to this position
    if (competitorId) {
      // First, remove this competitor from any other position they might be assigned to
      Object.keys(newAssignments).forEach(pos => {
        if (newAssignments[parseInt(pos)] === competitorId) {
          delete newAssignments[parseInt(pos)];
        }
      });
      
      // Assign competitor to the new position
      newAssignments[position] = competitorId;
    }
    
    setRankingAssignments(newAssignments);
    validateRankingCompleteness(newAssignments);
  };

  /**
   * Validate that all positions have been assigned and no competitor appears twice
   * This ensures we have a complete and valid ranking before allowing resolution
   */
  const validateRankingCompleteness = (assignments: Record<number, string>) => {
    const errors: string[] = [];
    const assignedCompetitors = Object.values(assignments);
    const assignedPositions = Object.keys(assignments).map(Number);
    
    // Check if all positions are filled
    const missingPositions = [];
    for (let i = 1; i <= totalPositions; i++) {
      if (!assignments[i]) {
        missingPositions.push(i);
      }
    }
    
    if (missingPositions.length > 0) {
      const positionText = missingPositions.map(p => getOrdinalNumber(p)).join(', ');
      errors.push(`Please assign competitors to these positions: ${positionText}`);
    }
    
    // Check for duplicate assignments (should not happen with our logic, but safety check)
    const uniqueCompetitors = Array.from(new Set(assignedCompetitors));
    if (assignedCompetitors.length !== uniqueCompetitors.length) {
      errors.push('Each competitor can only be assigned to one position.');
    }
    
    // Check if any competitors are missing from assignments
    const unassignedCompetitors = competitorsList.filter(
      competitor => !assignedCompetitors.includes(competitor.id)
    );
    
    if (unassignedCompetitors.length > 0) {
      const competitorNames = unassignedCompetitors.map(c => c.abbreviation).join(', ');
      errors.push(`These competitors need to be assigned positions: ${competitorNames}`);
    }
    
    setValidationErrors(errors);
  };

  /**
   * Convert number to ordinal (1st, 2nd, 3rd, etc.) for display purposes
   */
  const getOrdinalNumber = (num: number): string => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const value = num % 100;
    return num + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
  };

  /**
   * Get available competitors for a specific position dropdown
   * Excludes competitors already assigned to other positions
   */
  const getAvailableCompetitorsForPosition = (currentPosition: number): Competitor[] => {
    const currentlyAssignedCompetitorId = rankingAssignments[currentPosition];
    const otherAssignedCompetitorIds = Object.entries(rankingAssignments)
      .filter(([pos, _]) => parseInt(pos) !== currentPosition)
      .map(([_, competitorId]) => competitorId);
    
    return competitorsList.filter(competitor => 
      competitor.id === currentlyAssignedCompetitorId || 
      !otherAssignedCompetitorIds.includes(competitor.id)
    );
  };

  /**
   * Handle form submission to resolve the match
   * Converts position assignments to final rankings and triggers resolution
   */
  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation before submission
    validateRankingCompleteness(rankingAssignments);
    if (validationErrors.length > 0) {
      return;
    }
    
    // Convert position assignments to final rankings
    // Key: competitor ID, Value: final position (1 = winner, 2 = second place, etc.)
    const finalRankings: Record<string, number> = {};
    Object.entries(rankingAssignments).forEach(([position, competitorId]) => {
      finalRankings[competitorId] = parseInt(position);
    });
    
    await onResolveMatch(finalRankings);
  };

  /**
   * Check if the form is ready for submission
   * Requires all positions filled and no validation errors
   */
  const canSubmitResolution = Object.keys(rankingAssignments).length === totalPositions && 
                              validationErrors.length === 0 && 
                              !isResolving;

  // Run initial validation on component mount
  useEffect(() => {
    validateRankingCompleteness(rankingAssignments);
  }, []);

  return (
    <div className="f1-resolution-form">
      {/* Header with F1 racing stripe */}
      <div 
        className="f1-header mb-lg"
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
        
        <h2 className="text-glow mb-md">F1 Race Results - Step 2</h2>
        <div className="match-details">
          <h3 style={{ color: 'var(--text-accent)', marginBottom: 'var(--spacing-sm)' }}>
            {match.title}
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
            {match.subtitle}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Set the final finishing positions for each racer. This will determine the winners 
            of all {acceptedBets.length} accepted bet{acceptedBets.length !== 1 ? 's' : ''} for this race.
          </p>
        </div>
      </div>

      {/* Ranking assignment form */}
      <form onSubmit={handleSubmitResolution}>
        <div 
          className="ranking-assignments card mb-lg"
          style={{ padding: 'var(--spacing-xl)' }}
        >
          <h3 style={{ 
            color: 'var(--text-accent)', 
            marginBottom: 'var(--spacing-lg)',
            textAlign: 'center'
          }}>
            Set Final Race Positions
          </h3>

          {/* Position assignment dropdowns */}
          <div 
            className="position-assignments"
            style={{
              display: 'grid',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-lg)'
            }}
          >
            {Array.from({ length: totalPositions }, (_, index) => {
              const position = index + 1;
              const availableCompetitors = getAvailableCompetitorsForPosition(position);
              const selectedCompetitorId = rankingAssignments[position] || '';
              
              return (
                <div key={position} className="position-assignment">
                  <label 
                    className="form-label"
                    style={{ fontWeight: '600' }}
                  >
                    {getOrdinalNumber(position)} Place
                  </label>
                  <select
                    value={selectedCompetitorId}
                    onChange={(e) => handlePositionAssignment(position, e.target.value)}
                    disabled={isResolving}
                    className="form-select"
                    style={{ 
                      fontSize: '1rem',
                      background: selectedCompetitorId ? 'var(--bg-secondary)' : 'var(--bg-primary)'
                    }}
                  >
                    <option value="">Select racer for {getOrdinalNumber(position)} place</option>
                    {availableCompetitors.map(competitor => (
                      <option key={competitor.id} value={competitor.id}>
                        {competitor.name} ({competitor.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          {/* Validation errors display */}
          {validationErrors.length > 0 && (
            <div 
              className="validation-errors mb-lg"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--accent-red)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-md)'
              }}
            >
              <h4 style={{ color: 'var(--accent-red)', marginBottom: 'var(--spacing-sm)' }}>
                Please complete the rankings:
              </h4>
              <ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)' }}>
                {validationErrors.map((error, index) => (
                  <li key={index} style={{ color: 'var(--accent-red)', fontSize: '0.875rem' }}>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rankings preview when complete */}
          {Object.keys(rankingAssignments).length === totalPositions && validationErrors.length === 0 && (
            <div 
              className="rankings-preview mb-lg"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-lg)'
              }}
            >
              <h4 style={{ color: 'var(--text-accent)', marginBottom: 'var(--spacing-md)' }}>
                Final Race Results Preview
              </h4>
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 'var(--spacing-sm)'
                }}
              >
                {Array.from({ length: totalPositions }, (_, index) => {
                  const position = index + 1;
                  const competitorId = rankingAssignments[position];
                  const competitor = allCompetitorsInRace[competitorId];
                  
                  return (
                    <div
                      key={position}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)',
                        padding: 'var(--spacing-sm)',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        border: position <= 3 ? '1px solid var(--accent-green)' : '1px solid var(--border-primary)'
                      }}
                    >
                      <span style={{ 
                        fontWeight: '600',
                        color: position <= 3 ? 'var(--accent-green)' : 'var(--text-secondary)',
                        minWidth: '30px'
                      }}>
                        {getOrdinalNumber(position)}
                      </span>
                      <span style={{ 
                        color: 'var(--text-primary)',
                        fontWeight: '500'
                      }}>
                        {competitor?.abbreviation}
                      </span>
                    </div>
                  );
                })}
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

export default F1ResolutionFormView;
