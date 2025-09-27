import React, { useState, useEffect } from 'react';
import { Match } from '../types';
import { matchDataService } from '../utils/matchData';
import { blockchainService } from '../services/blockchain';
import { supabaseService } from '../services/supabase';
import StandardBetCreationView from './StandardBetCreationView';
import F1BetCreationView from './F1BetCreationView';
import '../styles/cyberpunk.css';

interface BetCreationViewProps {
  match: Match;
  onClose: () => void;
  onBetCreated: () => void;
}

/**
 * BetCreationView Component
 * Modal wrapper that determines which bet creation component to show
 * Routes to StandardBetCreationView for 1v1 sports or F1BetCreationView for F1
 */
const BetCreationView: React.FC<BetCreationViewProps> = ({ match, onClose, onBetCreated }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine which component to render based on match type
  const isF1Match = matchDataService.isF1Match(match.id);

  /**
   * Handle bet creation process
   * Common logic for both standard and F1 bets
   */
  const handleCreateBet = async (
    creatorSelection: string,
    amount: string,
    acceptorSelection?: string // Only for F1
  ) => {
    setIsCreating(true);
    setError(null);

    try {
      const user = blockchainService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get match data for metadata
      const league = matchDataService.getLeague(match.leagueID);
      const allCompetitors = matchDataService.getMatchCompetitors(match.id);
      
      // For F1 bets, only include the two selected competitors
      let competitors;
      if (acceptorSelection && league?.name === 'Formula 1') {
        // F1 bet: only include creator and acceptor selections
        competitors = {
          [creatorSelection]: allCompetitors[creatorSelection],
          [acceptorSelection]: allCompetitors[acceptorSelection]
        };
      } else {
        // Standard bet: include all competitors
        competitors = allCompetitors;
      }

      if (!league) {
        throw new Error('League data not found');
      }

      // Create initial bet metadata
      const betMetadata: any = {
        bet: {
          id: '', // Will be set after database insertion
          matchID: match.id,
          creator: {
            username: user.username,
            walletAddress: user.walletAddress,
            selectedCompetitorID: creatorSelection
          },
          amount: {
            currency: process.env.REACT_APP_DEFAULT_CURRENCY || 'CORE',
            value: parseFloat(amount)
          },
          status: 'open' as const,
          aiPrediction: {
            winningCompetitorID: '[TODO]',
            reason: '[TODO] AI prediction will be implemented here'
          },
          nftID: '' // Will be set after NFT minting
        },
        match,
        league,
        matchCompetitors: competitors
      };

      // For F1 bets, add acceptor selection to metadata
      if (acceptorSelection && league?.name === 'Formula 1') {
        betMetadata.bet.acceptor = {
          selectedCompetitorID: acceptorSelection
        };
      }

      // Upload initial metadata to Supabase
      const tempBetId = `temp-${Date.now()}`;
      const metadataURI = await supabaseService.uploadMetadata(tempBetId, betMetadata);

      // Create bet on blockchain
      const { betId, nftTokenId, transactionHash } = await blockchainService.createBet(
        match.id,
        creatorSelection,
        amount,
        metadataURI
      );

      // Update metadata with actual bet ID and NFT token ID
      betMetadata.bet.id = betId.toString();
      betMetadata.bet.nftID = nftTokenId.toString();

      // Upload updated metadata
      const finalMetadataURI = await supabaseService.uploadMetadata(betId.toString(), betMetadata);

      // Store bet in database using the blockchain bet ID
      const dbBet = {
        id: betId.toString(), // Use the blockchain bet ID as the database ID
        match_id: match.id,
        status: 'open' as const,
        created_date_utc: new Date().toISOString(),
        last_updated_date_utc: new Date().toISOString(),
        creator_username: user.username,
        acceptor_username: undefined,
        data: betMetadata
      };

      await supabaseService.insertBet(dbBet);

      console.log('Bet created successfully:', {
        betId,
        nftTokenId,
        transactionHash,
        metadataURI: finalMetadataURI
      });

      onBetCreated();

    } catch (err: any) {
      console.error('Bet creation failed:', err);
      setError(err.message || 'Failed to create bet. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!isCreating) {
      onClose();
    }
  };

  /**
   * Handle overlay click to close modal
   */
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div 
        className="modal"
        style={{
          width: '90vw',
          maxWidth: 'min(90vw, 720px)',
          maxHeight: '90vh',
          overflow: 'auto',
          background: 'transparent',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        {/* Modal Header Banner Card */}
        <div className="modal-header-banner-card" style={{
          maxWidth: '100%',
          width: '100%',
          marginBottom: 'var(--spacing-lg)'
        }}>
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
            <span style={{
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              CREATE BET
            </span>
            <button
              onClick={handleClose}
              disabled={isCreating}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '1.2rem',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                padding: '4px'
              }}
            >
              ✕
            </button>
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
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.875rem',
              margin: 0,
              textAlign: 'center'
            }}>
              Set up your bet details and challenge other players
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div 
            className="error-message mb-lg"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--accent-red)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-md)',
              color: 'var(--accent-red)',
              marginBottom: 'var(--spacing-lg)'
            }}
          >
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              {error}
            </p>
          </div>
        )}

        {/* Bet Creation Form */}
        {isF1Match ? (
          <F1BetCreationView
            match={match}
            onCreateBet={handleCreateBet}
            isCreating={isCreating}
          />
        ) : (
          <StandardBetCreationView
            match={match}
            onCreateBet={handleCreateBet}
            isCreating={isCreating}
          />
        )}

        {/* Loading Overlay */}
        {isCreating && (
          <div 
            className="loading-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(30, 39, 73, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-xl)'
            }}
          >
            <div className="loading-spinner-large" />
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>
              Creating Bet
            </h3>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px' }}>
              Confirming transaction on the blockchain. This may take a few seconds...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BetCreationView;
