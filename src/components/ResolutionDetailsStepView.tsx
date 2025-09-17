import React, { useState } from 'react';
import { Match, DatabaseBet } from '../types';
import { matchDataService } from '../utils/matchData';
import { blockchainService } from '../services/blockchain';
import { supabaseService } from '../services/supabase';
import F1ResolutionFormView from './F1ResolutionFormView';
import StandardResolutionFormView from './StandardResolutionFormView';
import '../styles/cyberpunk.css';

interface ResolutionDetailsStepViewProps {
  match: Match;
  acceptedBets: DatabaseBet[];
  onResolutionComplete: () => void;
  onBackToMatchSelection: () => void;
}

/**
 * ResolutionDetailsStepView Component
 * Second step of the match resolution process
 * Determines whether to show F1 or standard resolution form based on match type
 * Handles the actual bet resolution logic and blockchain/database updates
 */
const ResolutionDetailsStepView: React.FC<ResolutionDetailsStepViewProps> = ({
  match,
  acceptedBets,
  onResolutionComplete,
  onBackToMatchSelection
}) => {
  // State for tracking resolution process
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [resolutionSuccess, setResolutionSuccess] = useState<string | null>(null);

  // Determine if this is an F1 match to show appropriate resolution form
  const isF1Match = matchDataService.isF1Match(match.id);

  /**
   * Determine the winner of a bet based on match results
   * For F1: Compare rankings of creator vs acceptor selections
   * For Standard: Compare winner selection with creator's pick
   */
  const determineBetWinner = (
    bet: DatabaseBet,
    matchResult: Record<string, number> | string
  ): 'creator' | 'acceptor' => {
    const creatorSelection = bet.data.bet.creator.selectedCompetitorID;
    
    if (isF1Match) {
      // F1 Logic: Rankings comparison (lower number = better ranking)
      const rankings = matchResult as Record<string, number>;
      const acceptorSelection = bet.data.bet.acceptor?.selectedCompetitorID;
      
      if (!acceptorSelection) {
        throw new Error(`F1 bet ${bet.id} missing acceptor selection`);
      }
      
      const creatorRanking = rankings[creatorSelection];
      const acceptorRanking = rankings[acceptorSelection];
      
      if (creatorRanking === undefined || acceptorRanking === undefined) {
        throw new Error(`Missing ranking data for bet ${bet.id} competitors`);
      }
      
      // Creator wins if their racer ranked higher (lower number)
      return creatorRanking < acceptorRanking ? 'creator' : 'acceptor';
      
    } else {
      // Standard Logic: Direct winner comparison
      const matchWinnerId = matchResult as string;
      
      // Creator wins if their selection matches the match winner
      return creatorSelection === matchWinnerId ? 'creator' : 'acceptor';
    }
  };

  /**
   * Handle F1 match resolution with final rankings
   * Rankings parameter: { competitorId: finalPosition, ... }
   */
  const handleF1MatchResolution = async (finalRankings: Record<string, number>) => {
    await processMatchResolution(finalRankings);
  };

  /**
   * Handle standard match resolution with winner selection
   * WinnerCompetitorId parameter: ID of the winning competitor
   */
  const handleStandardMatchResolution = async (winnerCompetitorId: string) => {
    await processMatchResolution(winnerCompetitorId);
  };

  /**
   * Core resolution processing logic
   * Handles bet winner determination, blockchain resolution, and database updates
   */
  const processMatchResolution = async (
    matchResult: Record<string, number> | string
  ) => {
    setIsResolving(true);
    setResolutionError(null);
    setResolutionSuccess(null);

    try {
      console.log('Starting match resolution process...');
      
      // Track successful and failed resolutions for final reporting
      let successfulResolutions = 0;
      let failedResolutions = 0;
      const resolutionErrors: string[] = [];

      // Process each accepted bet individually
      for (const bet of acceptedBets) {
        try {
          console.log(`Processing bet ${bet.id}...`);
          
          // Determine the winner of this specific bet
          const betWinnerRole = determineBetWinner(bet, matchResult);
          const winnerUsername = betWinnerRole === 'creator' 
            ? bet.creator_username 
            : bet.acceptor_username;
          
          const winnerCompetitorId = betWinnerRole === 'creator'
            ? bet.data.bet.creator.selectedCompetitorID
            : bet.data.bet.acceptor?.selectedCompetitorID;

          if (!winnerUsername || !winnerCompetitorId) {
            throw new Error(`Missing winner data for bet ${bet.id}`);
          }

          // Update bet metadata with resolution results
          const updatedBetMetadata = {
            ...bet.data,
            bet: {
              ...bet.data.bet,
              status: 'resolved' as const,
              winner: {
                competitorID: winnerCompetitorId,
                username: winnerUsername,
                role: betWinnerRole
              }
            }
          };

          // Upload updated metadata to storage
          const updatedMetadataURI = await supabaseService.uploadMetadata(
            bet.id, 
            updatedBetMetadata
          );

          // Resolve bet on blockchain (releases funds to winner)
          await blockchainService.resolveBet(
            parseInt(bet.id),
            winnerCompetitorId,
            updatedMetadataURI
          );

          // Update bet status in database
          await supabaseService.updateBet(bet.id, {
            status: 'resolved',
            acceptor_username: bet.acceptor_username, // Maintain existing acceptor
            data: updatedBetMetadata
          });

          successfulResolutions++;
          console.log(`Successfully resolved bet ${bet.id} - Winner: ${winnerUsername}`);

        } catch (betError: any) {
          failedResolutions++;
          const errorMessage = `Bet ${bet.id}: ${betError.message}`;
          resolutionErrors.push(errorMessage);
          console.error(`Failed to resolve bet ${bet.id}:`, betError);
        }
      }

      // Generate final resolution summary
      if (successfulResolutions > 0) {
        const successMessage = `Successfully resolved ${successfulResolutions} bet${successfulResolutions !== 1 ? 's' : ''}` +
          (failedResolutions > 0 ? `. ${failedResolutions} bet${failedResolutions !== 1 ? 's' : ''} failed to resolve.` : '.');
        
        setResolutionSuccess(successMessage);
        
        // If all bets resolved successfully, automatically proceed after showing success
        if (failedResolutions === 0) {
          setTimeout(() => {
            onResolutionComplete();
          }, 3000); // Show success message for 3 seconds
        }
      } else {
        throw new Error('No bets were resolved. Please check the logs for details.');
      }

      // Log any resolution errors for debugging
      if (resolutionErrors.length > 0) {
        console.error('Resolution errors:', resolutionErrors);
      }

    } catch (err: any) {
      console.error('Match resolution failed:', err);
      setResolutionError(err.message || 'Failed to resolve match. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="resolution-details-step">
      {/* Back button */}
      <div className="step-navigation mb-lg">
        <button
          onClick={onBackToMatchSelection}
          disabled={isResolving}
          className="btn btn-secondary"
          style={{
            opacity: isResolving ? 0.5 : 1,
            cursor: isResolving ? 'not-allowed' : 'pointer'
          }}
        >
          ← Back to Match Selection
        </button>
      </div>

      {/* Error message display */}
      {resolutionError && (
        <div 
          className="resolution-error mb-lg"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--accent-red)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-lg)',
            color: 'var(--accent-red)'
          }}
        >
          <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Resolution Failed</h4>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>{resolutionError}</p>
          <button
            onClick={() => setResolutionError(null)}
            className="btn btn-small mt-md"
            style={{ background: 'var(--accent-red)' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success message display */}
      {resolutionSuccess && (
        <div 
          className="resolution-success mb-lg"
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid var(--accent-green)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-lg)',
            color: 'var(--accent-green)'
          }}
        >
          <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Resolution Complete!</h4>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>{resolutionSuccess}</p>
          <p style={{ margin: 'var(--spacing-sm) 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Returning to match selection in a few seconds...
          </p>
        </div>
      )}

      {/* Bet summary before resolution */}
      {!resolutionSuccess && (
        <div 
          className="bet-summary card mb-lg"
          style={{ padding: 'var(--spacing-lg)' }}
        >
          <h3 style={{ color: 'var(--text-accent)', marginBottom: 'var(--spacing-md)' }}>
            Bets to Resolve ({acceptedBets.length})
          </h3>
          <div 
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              marginBottom: 'var(--spacing-md)'
            }}
          >
            {acceptedBets.map(bet => (
              <div
                key={bet.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--spacing-sm)',
                  marginBottom: 'var(--spacing-xs)',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem'
                }}
              >
                <span style={{ color: 'var(--text-primary)' }}>
                  {bet.creator_username} vs {bet.acceptor_username}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {bet.data.bet.amount.value} {bet.data.bet.amount.currency}
                </span>
              </div>
            ))}
          </div>
          <p style={{ 
            color: 'var(--text-muted)', 
            fontSize: '0.75rem',
            margin: 0,
            fontStyle: 'italic'
          }}>
            Funds will be distributed automatically based on your match results below.
          </p>
        </div>
      )}

      {/* Resolution form - F1 or Standard based on match type */}
      {!resolutionSuccess && (
        isF1Match ? (
          <F1ResolutionFormView
            match={match}
            acceptedBets={acceptedBets}
            onResolveMatch={handleF1MatchResolution}
            isResolving={isResolving}
          />
        ) : (
          <StandardResolutionFormView
            match={match}
            acceptedBets={acceptedBets}
            onResolveMatch={handleStandardMatchResolution}
            isResolving={isResolving}
          />
        )
      )}
    </div>
  );
};

export default ResolutionDetailsStepView;
