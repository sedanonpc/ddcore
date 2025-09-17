import React, { useState, useEffect } from 'react';
import { Match, DatabaseBet } from '../types';
import { matchDataService } from '../utils/matchData';
import { supabaseService } from '../services/supabase';
import '../styles/cyberpunk.css';

interface MatchSelectionStepViewProps {
  onMatchSelected: (match: Match, acceptedBets: DatabaseBet[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * MatchSelectionStepView Component
 * First step of the match resolution process
 * Allows admin user to select which match to resolve from a dropdown of all available matches
 * Loads and validates that the selected match has accepted bets before proceeding
 */
const MatchSelectionStepView: React.FC<MatchSelectionStepViewProps> = ({
  onMatchSelected,
  isLoading,
  setIsLoading,
  setError
}) => {
  // State for the currently selected match ID from the dropdown
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  
  // State to store accepted bets for the selected match (for validation)
  const [acceptedBetsForSelectedMatch, setAcceptedBetsForSelectedMatch] = useState<DatabaseBet[]>([]);

  // Get all available matches from the match data service
  const availableMatches = matchDataService.getAllMatches();

  // Add unmount tracking for debugging
  useEffect(() => {
    console.log('🔍 STEP: MatchSelectionStepView mounted');
    return () => {
      console.log('🔍 STEP: MatchSelectionStepView unmounting!');
    };
  }, []);

  /**
   * Handle match selection change from dropdown
   * When a match is selected, load its accepted bets for validation
   */
  const handleMatchSelectionChange = async (matchId: string) => {
    try {
      console.log('🔍 STEP: handleMatchSelectionChange started for:', matchId);
      
      // Clear previous state first
      setAcceptedBetsForSelectedMatch([]);
      setError(null);

      // If no match selected, clear everything
      if (!matchId) {
        console.log('🔍 STEP: No matchId provided, returning');
        return;
      }

      setIsLoading(true);
      console.log('🔍 STEP: Loading set to true, about to fetch bets');
      
      // Load all bets for this match and filter for accepted ones
      const allBetsForMatch = await supabaseService.getMatchBets(matchId);
      console.log('🔍 STEP: Got bets from supabase:', allBetsForMatch);
      const acceptedBetsOnly = allBetsForMatch.filter(bet => bet.status === 'accepted');
      console.log('🔍 STEP: Filtered accepted bets:', acceptedBetsOnly);
      
      setAcceptedBetsForSelectedMatch(acceptedBetsOnly);
      console.log('🔍 STEP: Set accepted bets in state');
      
      // Show warning if no accepted bets found
      if (acceptedBetsOnly.length === 0) {
        console.log('🔍 STEP: Setting error - no accepted bets');
        setError('This match has no accepted bets to resolve. Please select a different match.');
      } else {
        console.log('🔍 STEP: Found accepted bets, clearing error');
        setError(null);
      }
      
      console.log('🔍 STEP: handleMatchSelectionChange completed successfully');
      
    } catch (err: any) {
      console.error('🔍 STEP: Error in handleMatchSelectionChange:', err);
      setError(err.message || 'Failed to load bets for selected match. Please try again.');
      setAcceptedBetsForSelectedMatch([]);
    } finally {
      console.log('🔍 STEP: Setting loading to false');
      setIsLoading(false);
    }
  };

  /**
   * Handle proceeding to the next step (resolution details)
   * Validates that a match is selected and has accepted bets before proceeding
   */
  const handleProceedToResolution = () => {
    if (!selectedMatchId) {
      setError('Please select a match to resolve.');
      return;
    }

    if (acceptedBetsForSelectedMatch.length === 0) {
      setError('Selected match has no accepted bets to resolve.');
      return;
    }

    // Get the full match data and proceed to resolution step
    const selectedMatchData = availableMatches.find(match => match.id === selectedMatchId);
    if (!selectedMatchData) {
      setError('Selected match data not found.');
      return;
    }

    onMatchSelected(selectedMatchData, acceptedBetsForSelectedMatch);
  };

  /**
   * Check if the proceed button should be enabled
   * Requires: match selected, accepted bets available, not currently loading
   */
  const canProceedToResolution = selectedMatchId && 
                                 acceptedBetsForSelectedMatch.length > 0 && 
                                 !isLoading;

  // Debug the button state
  console.log('🔍 STEP: Button state check - selectedMatchId:', selectedMatchId);
  console.log('🔍 STEP: Button state check - acceptedBetsForSelectedMatch.length:', acceptedBetsForSelectedMatch.length);
  console.log('🔍 STEP: Button state check - isLoading:', isLoading);
  console.log('🔍 STEP: Button state check - canProceedToResolution:', canProceedToResolution);

  return (
    <div className="match-selection-step">
      {/* Header explaining the resolution process */}
      <div className="resolution-intro mb-lg">
        <h1 className="text-glow mb-md">Match Resolution - Step 1</h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '1.125rem',
          lineHeight: '1.6',
          marginBottom: 'var(--spacing-lg)'
        }}>
          Select a match to resolve. This will determine the winners of all accepted bets 
          for that match and distribute funds from the smart contract escrow.
        </p>
        
        {/* Admin warning notice */}
        <div 
          className="admin-warning mb-lg"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--accent-red)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-md)',
            color: 'var(--accent-red)'
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>
            ⚠️ Admin Only: This action will resolve bets and distribute funds on the blockchain. 
            Ensure match results are final before proceeding.
          </p>
        </div>
      </div>

      {/* Match selection form */}
      <div 
        className="match-selection-form card"
        style={{
          padding: 'var(--spacing-xl)',
          marginBottom: 'var(--spacing-lg)'
        }}
      >
        <h3 style={{ 
          color: 'var(--text-accent)', 
          marginBottom: 'var(--spacing-lg)' 
        }}>
          Select Match to Resolve
        </h3>

        {/* Match selection dropdown */}
        <div className="form-group mb-lg">
          <label className="form-label">
            Available Matches
          </label>
          <select
            value={selectedMatchId}
            onChange={(e) => {
              const matchId = e.target.value;
              console.log('🔍 STEP: onChange called with:', matchId);
              setSelectedMatchId(matchId);
              
              if (matchId) {
                // Call async function to load bets for selected match
                console.log('🔍 STEP: About to call handleMatchSelectionChange');
                handleMatchSelectionChange(matchId);
              } else {
                console.log('🔍 STEP: Clearing state for empty selection');
                setAcceptedBetsForSelectedMatch([]);
                setError(null);
              }
            }}
            disabled={isLoading}
            className="form-select"
            style={{ fontSize: '1rem' }}
          >
            <option value="">Select a match...</option>
            {availableMatches.map(match => {
              // Get league info for display
              const league = matchDataService.getLeague(match.leagueID);
              const formattedDate = matchDataService.getFormattedMatchDate(match.id);
              
              return (
                <option key={match.id} value={match.id}>
                  {league?.name} - {match.title} ({formattedDate})
                </option>
              );
            })}
          </select>
        </div>

        {/* Show match details when one is selected */}
        {selectedMatchId && (
          <div 
            className="selected-match-details mb-lg"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-lg)'
            }}
          >
            {(() => {
              // Get detailed match information for display
              const selectedMatch = availableMatches.find(m => m.id === selectedMatchId);
              if (!selectedMatch) return null;

              const league = matchDataService.getLeague(selectedMatch.leagueID);
              const competitors = matchDataService.getMatchCompetitors(selectedMatch.id);
              const isF1Match = matchDataService.isF1Match(selectedMatch.id);

              return (
                <>
                  <h4 style={{ color: 'var(--text-accent)', marginBottom: 'var(--spacing-md)' }}>
                    Selected Match Details
                  </h4>
                  
                  {/* League and match info */}
                  <div className="match-info mb-md">
                    <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>League:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{league?.name}</span>
                    </div>
                    <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Match:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{selectedMatch.title}</span>
                    </div>
                    <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Type:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {isF1Match ? 'F1 Race (Ranking-based)' : '1v1 Match (Winner-based)'}
                      </span>
                    </div>
                  </div>

                  {/* Competitors list */}
                  <div className="competitors-info mb-md">
                    <strong style={{ color: 'var(--text-primary)' }}>Competitors:</strong>
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 'var(--spacing-sm)', 
                      marginTop: 'var(--spacing-xs)' 
                    }}>
                      {Object.values(competitors).map(competitor => (
                        <span
                          key={competitor.id}
                          style={{
                            background: 'var(--bg-secondary)',
                            padding: 'var(--spacing-xs) var(--spacing-sm)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {competitor.abbreviation}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Accepted bets count and status */}
                  <div className="bets-info">
                    <strong style={{ color: 'var(--text-primary)' }}>Accepted Bets:</strong>{' '}
                    <span style={{ 
                      color: acceptedBetsForSelectedMatch.length > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      fontWeight: '600'
                    }}>
                      {isLoading ? 'Loading...' : `${acceptedBetsForSelectedMatch.length} bet${acceptedBetsForSelectedMatch.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Next step button */}
        <button
          onClick={handleProceedToResolution}
          disabled={!canProceedToResolution}
          className="btn btn-primary btn-large w-full"
          style={{
            opacity: canProceedToResolution ? 1 : 0.5,
            cursor: canProceedToResolution ? 'pointer' : 'not-allowed'
          }}
        >
          {isLoading ? (
            <>
              <span className="loading-spinner" style={{ marginRight: 'var(--spacing-sm)' }} />
              Loading Bets...
            </>
          ) : (
            `Next: Set Match Results (${acceptedBetsForSelectedMatch.length} bet${acceptedBetsForSelectedMatch.length !== 1 ? 's' : ''})`
          )}
        </button>
      </div>
    </div>
  );
};

export default MatchSelectionStepView;
