import React, { useState, useEffect } from 'react';
import { matchDataService } from '../utils/matchData';
import { supabaseService } from '../services/supabase';
import { blockchainService } from '../services/blockchain';
import { Match, DatabaseBet, Competitor } from '../types';
import '../styles/cyberpunk.css';

/**
 * MatchResolutionView Component
 * Admin interface for resolving matches and distributing winnings
 * Accessible via direct URL entry only (/resolve)
 */
const MatchResolutionView: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [matchCompetitors, setMatchCompetitors] = useState<Record<string, Competitor>>({});
  const [acceptedBets, setAcceptedBets] = useState<DatabaseBet[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    if (selectedMatch) {
      loadMatchData();
      loadAcceptedBets();
    } else {
      setMatchCompetitors({});
      setAcceptedBets([]);
      setSelectedWinner('');
    }
  }, [selectedMatch]);

  /**
   * Load all available matches
   */
  const loadMatches = () => {
    try {
      const allMatches = matchDataService.getAllMatches();
      setMatches(allMatches);
    } catch (err: any) {
      console.error('Failed to load matches:', err);
      setError('Failed to load matches');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load competitors for the selected match
   */
  const loadMatchData = () => {
    if (!selectedMatch) return;

    try {
      const competitors = matchDataService.getMatchCompetitors(selectedMatch);
      setMatchCompetitors(competitors);
    } catch (err: any) {
      console.error('Failed to load match data:', err);
      setError('Failed to load match data');
    }
  };

  /**
   * Load accepted bets for the selected match
   */
  const loadAcceptedBets = async () => {
    if (!selectedMatch) return;

    try {
      const bets = await supabaseService.getMatchBets(selectedMatch);
      const acceptedBets = bets.filter(bet => bet.status === 'accepted');
      setAcceptedBets(acceptedBets);
    } catch (err: any) {
      console.error('Failed to load accepted bets:', err);
      setError('Failed to load bets for this match');
    }
  };

  /**
   * Handle match resolution
   */
  const handleResolveMatch = async () => {
    if (!selectedMatch || !selectedWinner) {
      setError('Please select both a match and a winner');
      return;
    }

    setIsResolving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let resolvedCount = 0;
      let failedCount = 0;

      // Resolve each accepted bet for this match
      for (const bet of acceptedBets) {
        try {
          // Determine the winning user based on their selection
          let winnerUsername: string;
          let winnerRole: 'creator' | 'acceptor';

          if (bet.data.bet.creator.selectedCompetitorID === selectedWinner) {
            winnerUsername = bet.data.bet.creator.username;
            winnerRole = 'creator';
          } else if (bet.data.bet.acceptor?.selectedCompetitorID === selectedWinner) {
            winnerUsername = bet.data.bet.acceptor.username;
            winnerRole = 'acceptor';
          } else {
            // Neither player selected the winner - this shouldn't happen in normal cases
            console.warn(`No winner found for bet ${bet.id} with winner ${selectedWinner}`);
            continue;
          }

          // Update bet metadata with resolution
          const updatedBetData = {
            ...bet.data.bet,
            status: 'resolved' as const,
            winner: {
              competitorID: selectedWinner,
              username: winnerUsername,
              role: winnerRole
            }
          };

          const updatedMetadata = {
            ...bet.data,
            bet: updatedBetData
          };

          // Upload final metadata
          const finalMetadataURI = await supabaseService.uploadMetadata(bet.id, updatedMetadata);

          // Resolve bet on blockchain
          await blockchainService.resolveBet(
            parseInt(bet.id),
            selectedWinner,
            finalMetadataURI
          );

          // Update bet in database
          await supabaseService.updateBet(bet.id, {
            status: 'resolved',
            data: updatedMetadata
          });

          resolvedCount++;

        } catch (betError: any) {
          console.error(`Failed to resolve bet ${bet.id}:`, betError);
          failedCount++;
        }
      }

      if (resolvedCount > 0) {
        setSuccessMessage(
          `Successfully resolved ${resolvedCount} bet${resolvedCount !== 1 ? 's' : ''}` +
          (failedCount > 0 ? `. ${failedCount} bet${failedCount !== 1 ? 's' : ''} failed to resolve.` : '.')
        );
        
        // Reload bets to reflect changes
        await loadAcceptedBets();
      } else {
        setError('No bets were resolved. Please check the logs for details.');
      }

    } catch (err: any) {
      console.error('Match resolution failed:', err);
      setError(err.message || 'Failed to resolve match. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  /**
   * Get match by ID
   */
  const getSelectedMatchData = () => {
    return matches.find(match => match.id === selectedMatch);
  };

  /**
   * Clear messages
   */
  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner-large" />
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>
          Loading Match Resolution
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Preparing admin interface...
        </p>
      </div>
    );
  }

  const selectedMatchData = getSelectedMatchData();

  return (
    <div 
      className="match-resolution-container"
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: 'var(--spacing-xl) var(--spacing-lg)'
      }}
    >
      {/* Header */}
      <div className="resolution-header mb-lg">
        <h1 className="text-glow">Match Resolution</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
          Admin interface for resolving matches and distributing winnings
        </p>
        <div 
          className="admin-warning mt-md"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--accent-red)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-md)',
            color: 'var(--accent-red)',
            fontSize: '0.875rem'
          }}
        >
          ⚠️ Admin Only: This action will resolve bets and distribute funds on the blockchain.
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div 
          className="success-message mb-lg"
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--accent-green)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-md)',
            color: 'var(--accent-green)'
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            ✅ {successMessage}
          </p>
          <button
            onClick={clearMessages}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-green)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              marginTop: 'var(--spacing-xs)',
              textDecoration: 'underline'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div 
          className="error-message mb-lg"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--accent-red)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-md)',
            color: 'var(--accent-red)'
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            {error}
          </p>
          <button
            onClick={clearMessages}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-red)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              marginTop: 'var(--spacing-xs)',
              textDecoration: 'underline'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Resolution Form */}
      <div 
        className="resolution-form card"
        style={{ padding: 'var(--spacing-xl)' }}
      >
        {/* Match Selection */}
        <div className="form-group">
          <label className="form-label">
            Select Match to Resolve
          </label>
          <select
            value={selectedMatch}
            onChange={(e) => setSelectedMatch(e.target.value)}
            disabled={isResolving}
            className="form-select"
          >
            <option value="">Choose a match...</option>
            {matches.map(match => (
              <option key={match.id} value={match.id}>
                {match.title} - {match.subtitle}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Match Info */}
        {selectedMatchData && (
          <div 
            className="selected-match-info mb-lg"
            style={{
              background: 'var(--bg-tertiary)',
              padding: 'var(--spacing-lg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)'
            }}
          >
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>
              {selectedMatchData.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
              {selectedMatchData.subtitle}
            </p>
            <div 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.875rem',
                color: 'var(--text-muted)'
              }}
            >
              <span>Venue: {selectedMatchData.location.title}</span>
              <span>Accepted Bets: {acceptedBets.length}</span>
            </div>
          </div>
        )}

        {/* Winner Selection */}
        {Object.keys(matchCompetitors).length > 0 && (
          <div className="form-group">
            <label className="form-label">
              Select Winner
            </label>
            <select
              value={selectedWinner}
              onChange={(e) => setSelectedWinner(e.target.value)}
              disabled={isResolving}
              className="form-select"
            >
              <option value="">Choose the winner...</option>
              {Object.values(matchCompetitors).map(competitor => (
                <option key={competitor.id} value={competitor.id}>
                  {competitor.name} ({competitor.abbreviation})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Bet Summary */}
        {acceptedBets.length > 0 && (
          <div 
            className="bet-summary mb-lg"
            style={{
              background: 'var(--bg-secondary)',
              padding: 'var(--spacing-lg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-accent)'
            }}
          >
            <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-accent)' }}>
              Bets to Resolve ({acceptedBets.length})
            </h4>
            <div 
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-sm)'
              }}
            >
              {acceptedBets.map(bet => (
                <div
                  key={bet.id}
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: 'var(--spacing-md)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-primary)',
                    fontSize: '0.875rem'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: 'var(--spacing-xs)' }}>
                    Bet #{bet.id} - {bet.data.bet.amount.value} {bet.data.bet.amount.currency}
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {bet.data.bet.creator.username} vs {bet.data.bet.acceptor?.username}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolve Button */}
        <button
          onClick={handleResolveMatch}
          disabled={!selectedMatch || !selectedWinner || acceptedBets.length === 0 || isResolving}
          className="btn btn-primary btn-large w-full"
          style={{
            opacity: (!selectedMatch || !selectedWinner || acceptedBets.length === 0 || isResolving) ? 0.5 : 1,
            cursor: (!selectedMatch || !selectedWinner || acceptedBets.length === 0 || isResolving) ? 'not-allowed' : 'pointer'
          }}
        >
          {isResolving ? (
            <>
              <span className="loading-spinner" style={{ marginRight: 'var(--spacing-sm)' }} />
              Resolving Match...
            </>
          ) : (
            `Resolve Match${acceptedBets.length > 0 ? ` (${acceptedBets.length} bets)` : ''}`
          )}
        </button>

        {acceptedBets.length === 0 && selectedMatch && (
          <p 
            style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              marginTop: 'var(--spacing-md)'
            }}
          >
            No accepted bets found for this match
          </p>
        )}
      </div>

      {/* Loading Overlay */}
      {isResolving && (
        <div 
          className="loading-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 10, 15, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
        >
          <div className="loading-spinner-large" />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>
            Resolving Match
          </h3>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>
            Processing blockchain transactions and distributing winnings. This may take several minutes...
          </p>
        </div>
      )}
    </div>
  );
};

export default MatchResolutionView;


