import React, { useState } from 'react';
import { DatabaseBet } from '../types';
import { matchDataService } from '../utils/matchData';
import { blockchainService } from '../services/blockchain';
import { supabaseService } from '../services/supabase';
import '../styles/cyberpunk.css';

interface BetAcceptanceViewProps {
  bet: DatabaseBet;
  onClose: () => void;
  onBetAccepted: () => void;
}

/**
 * BetAcceptanceView Component
 * Modal for accepting an open bet
 * Shows bet details and allows user to accept with automatic opponent selection
 */
const BetAcceptanceView: React.FC<BetAcceptanceViewProps> = ({ bet, onClose, onBetAccepted }) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data } = bet;
  const { match, league, matchCompetitors, bet: betData } = data;

  // Get creator's selected competitor
  const creatorCompetitor = matchCompetitors[betData.creator.selectedCompetitorID];
  
  // Determine acceptor's selection (opposite competitor for 1v1, or pre-selected for F1)
  const isF1Match = matchDataService.isF1Match(match.id);
  let acceptorSelection: string;
  let acceptorCompetitor: any;

  if (isF1Match) {
    // For F1, the acceptor selection should be predetermined (the "opponent" racer)
    // This would be stored in the bet metadata when created
    acceptorSelection = betData.acceptor?.selectedCompetitorID || '';
    acceptorCompetitor = acceptorSelection ? matchCompetitors[acceptorSelection] : null;
  } else {
    // For 1v1 sports, automatically select the opposite competitor
    const competitorIds = Object.keys(matchCompetitors);
    acceptorSelection = competitorIds.find(id => id !== betData.creator.selectedCompetitorID) || '';
    acceptorCompetitor = acceptorSelection ? matchCompetitors[acceptorSelection] : null;
  }

  // Get bet question text
  const betQuestion = matchDataService.getBetQuestion(match.id);

  // Get formatted dates
  const matchDate = new Date(match.scheduledDateInUTC);
  const formattedMatchDate = matchDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  /**
   * Handle bet acceptance process
   */
  const handleAcceptBet = async () => {
    setIsAccepting(true);
    setError(null);

    try {
      const user = blockchainService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!acceptorSelection || !acceptorCompetitor) {
        throw new Error('Invalid acceptor selection');
      }

      // Update bet metadata with acceptor information
      const updatedBetData = {
        ...betData,
        acceptor: {
          username: user.username,
          walletAddress: user.walletAddress,
          selectedCompetitorID: acceptorSelection
        },
        status: 'accepted' as const
      };

      const updatedMetadata = {
        ...data,
        bet: updatedBetData
      };

      // Upload updated metadata to Supabase
      const newMetadataURI = await supabaseService.uploadMetadata(bet.id, updatedMetadata);

      // Get the bet amount - ensure it's a valid number
      const betAmount = betData.amount?.value || betData.amount;
      console.log('Bet amount from data:', betAmount, 'type:', typeof betAmount);
      
      let amountString: string;
      if (typeof betAmount === 'number' && !isNaN(betAmount)) {
        amountString = betAmount.toString();
      } else if (typeof betAmount === 'string' && !isNaN(parseFloat(betAmount))) {
        amountString = betAmount;
      } else {
        throw new Error(`Invalid bet amount: ${betAmount}`);
      }
      
      console.log('Using amount string:', amountString);
      console.log('Bet ID:', bet.id, 'type:', typeof bet.id);

      // Accept bet on blockchain (bet.id is now the same as blockchain bet ID)
      const transactionHash = await blockchainService.acceptBet(
        parseInt(bet.id),
        acceptorSelection,
        amountString,
        newMetadataURI
      );

      // Update bet in database
      await supabaseService.updateBet(bet.id, {
        status: 'accepted',
        acceptor_username: user.username,
        data: updatedMetadata
      });

      console.log('Bet accepted successfully:', {
        betId: bet.id,
        transactionHash,
        acceptorSelection
      });

      onBetAccepted();

    } catch (err: any) {
      console.error('Bet acceptance failed:', err);
      setError(err.message || 'Failed to accept bet. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!isAccepting) {
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
              ACCEPT BET
            </span>
            <button
              onClick={handleClose}
              disabled={isAccepting}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '1.2rem',
                cursor: isAccepting ? 'not-allowed' : 'pointer',
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
              Review bet details and confirm your acceptance
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
          {isF1Match && (
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
          )}

          {/* League */}
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
              {formattedMatchDate}
            </div>
          </div>
        </div>

        {/* Bet Details */}
        <div 
          className="bet-details mb-lg"
          style={{
            background: 'var(--bg-secondary)',
            padding: 'var(--spacing-lg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-accent)'
          }}
        >
          {/* Creator Info */}
          <div className="creator-info mb-lg">
            <h4 
              style={{
                color: 'var(--text-accent)',
                marginBottom: 'var(--spacing-md)'
              }}
            >
              Bet Creator
            </h4>
            <div 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--spacing-md)'
              }}
            >
              <div>
                <div 
                  style={{
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--spacing-xs)'
                  }}
                >
                  {betData.creator.username}
                </div>
                <div 
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  Bet Amount: {betData.amount.value} {betData.amount.currency}
                </div>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="bet-question mb-lg">
            <h4 
              style={{
                color: 'var(--text-accent)',
                textAlign: 'center',
                fontSize: '1.125rem'
              }}
            >
              {betQuestion}
            </h4>
          </div>

          {/* Selections Comparison */}
          <div 
            className="selections-comparison mb-lg"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: 'var(--spacing-md)',
              alignItems: 'center'
            }}
          >
            {/* Creator's Pick */}
            {creatorCompetitor && (
              <div 
                style={{
                  textAlign: 'center',
                  padding: 'var(--spacing-md)',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--accent-cyan)'
                }}
              >
                <div 
                  style={{
                    color: 'var(--accent-cyan)',
                    fontSize: '0.75rem',
                    marginBottom: 'var(--spacing-sm)',
                    fontWeight: '600'
                  }}
                >
                  {betData.creator.username.toUpperCase()}'S PICK
                </div>
                <img
                  src={creatorCompetitor.imageURL}
                  alt={creatorCompetitor.name}
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-sm)'
                  }}
                />
                <div 
                  style={{
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--spacing-xs)'
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
            )}

            {/* VS */}
            <div 
              style={{
                color: 'var(--text-accent)',
                fontSize: '1.25rem',
                fontWeight: '600'
              }}
            >
              VS
            </div>

            {/* Your Pick */}
            {acceptorCompetitor && (
              <div 
                style={{
                  textAlign: 'center',
                  padding: 'var(--spacing-md)',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--accent-green)'
                }}
              >
                <div 
                  style={{
                    color: 'var(--accent-green)',
                    fontSize: '0.75rem',
                    marginBottom: 'var(--spacing-sm)',
                    fontWeight: '600'
                  }}
                >
                  YOUR PICK
                </div>
                <img
                  src={acceptorCompetitor.imageURL}
                  alt={acceptorCompetitor.name}
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-sm)'
                  }}
                />
                <div 
                  style={{
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--spacing-xs)'
                  }}
                >
                  {acceptorCompetitor.abbreviation}
                </div>
                <div 
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {acceptorCompetitor.name}
                </div>
              </div>
            )}
          </div>

          {/* AI Prediction */}
          <div 
            className="ai-prediction"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-md)'
            }}
          >
            <h4 
              style={{
                color: 'var(--text-accent)',
                marginBottom: 'var(--spacing-sm)',
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
              {betData.aiPrediction?.reason || '[TODO] AI prediction will be displayed here'}
            </div>
          </div>
        </div>

        {/* Accept Button */}
        <button
          onClick={handleAcceptBet}
          disabled={isAccepting || !acceptorCompetitor}
          className="btn btn-primary btn-large w-full glow-strong"
          style={{
            opacity: (isAccepting || !acceptorCompetitor) ? 0.5 : 1,
            cursor: (isAccepting || !acceptorCompetitor) ? 'not-allowed' : 'pointer'
          }}
        >
          {isAccepting ? (
            <>
              <span className="loading-spinner" style={{ marginRight: 'var(--spacing-sm)' }} />
              Accepting Bet...
            </>
          ) : (
            'DARE to bet!'
          )}
        </button>

        {/* Loading Overlay */}
        {isAccepting && (
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
              Accepting Bet
            </h3>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px' }}>
              Confirming transaction on the blockchain. This may take a few seconds...
            </p>
          </div>
        )}

        {/* Mobile styles are handled in the cyberpunk.css file */}
      </div>
    </div>
  );
};

export default BetAcceptanceView;
