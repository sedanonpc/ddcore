import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatabaseBet, Match, Competitor } from '../types';
import { blockchainService } from '../services/blockchain';
import { supabaseService } from '../services/supabase';
import { matchDataService } from '../utils/matchData';
import { Squares } from '../components/Squares';
import '../styles/cyberpunk.css';

/**
 * MatchResolutionView Component
 * Single-page admin interface for resolving matches and distributing winnings
 * Shows match selection dropdown and appropriate resolution form on the same page
 * Accessible via direct URL entry only (/resolve)
 */
const MatchResolutionView: React.FC = () => {
  const navigate = useNavigate();
  
  // State for match selection and resolution
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [acceptedBets, setAcceptedBets] = useState<DatabaseBet[]>([]);
  
  // State for F1 resolution (rankings)
  const [f1Rankings, setF1Rankings] = useState<Record<number, string>>({});
  
  // State for standard resolution (winner selection)
  const [standardWinner, setStandardWinner] = useState<string>('');
  
  // State for loading and error handling
  const [isLoadingBets, setIsLoadingBets] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // State for wallet connection status (to trigger re-renders)
  const [walletConnected, setWalletConnected] = useState(false);

  // Get all available matches
  const availableMatches = matchDataService.getAllMatches();

  /**
   * Check authentication and reconnect wallet on component mount
   * Redirect to landing page if user is not authenticated
   */
  useEffect(() => {
    const initializeWalletConnection = async () => {
      const user = blockchainService.getCurrentUser();
      if (!user) {
        navigate('/');
        return;
      }

      // Try to reconnect wallet if not already connected
      if (!blockchainService.isConnected()) {
        console.log('Wallet not connected, attempting to reconnect...');
        const reconnected = await blockchainService.reconnectWallet();
        if (!reconnected) {
          console.log('Failed to reconnect wallet, but user is authenticated');
          setWalletConnected(false);
        } else {
          console.log('Wallet reconnected successfully');
          setWalletConnected(true);
        }
      } else {
        setWalletConnected(true);
      }
    };

    initializeWalletConnection();
  }, [navigate]);

  /**
   * Handle match selection change from dropdown
   * Load accepted bets for the selected match
   */
  const handleMatchSelection = async (matchId: string) => {
    setSelectedMatchId(matchId);
    setError(null);
    setSuccess(null);
    
    // Clear previous resolution state
    setF1Rankings({});
    setStandardWinner('');
    setAcceptedBets([]);
    setSelectedMatch(null);

    if (!matchId) {
      return;
    }

    try {
      setIsLoadingBets(true);
      
      // Get match data
      const matchData = availableMatches.find(match => match.id === matchId);
      if (!matchData) {
        setError('Selected match data not found.');
        return;
      }
      setSelectedMatch(matchData);
      
      // Load bets for this match
      const allBetsForMatch = await supabaseService.getMatchBets(matchId);
      const acceptedBetsOnly = allBetsForMatch.filter(bet => bet.status === 'accepted');
      
      setAcceptedBets(acceptedBetsOnly);
      
      if (acceptedBetsOnly.length === 0) {
        setError('This match has no accepted bets to resolve. Please select a different match.');
      }
      
    } catch (err: any) {
      console.error('Failed to load match bets:', err);
      setError(err.message || 'Failed to load bets for selected match. Please try again.');
    } finally {
      setIsLoadingBets(false);
    }
  };

  /**
   * Handle F1 ranking assignment
   */
  const handleF1RankingChange = (position: number, competitorId: string) => {
    const newRankings = { ...f1Rankings };
    
    // Remove this competitor from any other position
    Object.keys(newRankings).forEach(pos => {
      if (newRankings[parseInt(pos)] === competitorId) {
        delete newRankings[parseInt(pos)];
      }
    });
    
    // Assign competitor to new position (or remove if empty)
    if (competitorId) {
      newRankings[position] = competitorId;
    } else {
      delete newRankings[position];
    }
    
    setF1Rankings(newRankings);
  };

  /**
   * Determine bet winner based on match results
   */
  const determineBetWinner = (
    bet: DatabaseBet,
    isF1: boolean,
    matchResult: Record<string, number> | string
  ): 'creator' | 'acceptor' => {
    const creatorSelection = bet.data.bet.creator.selectedCompetitorID;
    
    if (isF1) {
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
      
      // Creator wins if their racer ranked higher (lower number = better)
      return creatorRanking < acceptorRanking ? 'creator' : 'acceptor';
    } else {
      // Standard: creator wins if their selection matches the match winner
      const matchWinnerId = matchResult as string;
      return creatorSelection === matchWinnerId ? 'creator' : 'acceptor';
    }
  };

  /**
   * Handle match resolution
   */
  const handleResolveMatch = async () => {
    if (!selectedMatch || acceptedBets.length === 0) {
      setError('Please select a match with accepted bets.');
      return;
    }

    // Check blockchain connection before proceeding
    if (!blockchainService.isConnected()) {
      setError('MetaMask wallet is not connected. Please connect your wallet and try again.');
      return;
    }

    const user = blockchainService.getCurrentUser();
    if (!user) {
      setError('No authenticated user found. Please connect your wallet.');
      return;
    }

    const isF1 = matchDataService.isF1Match(selectedMatch.id);
    const competitors = matchDataService.getMatchCompetitors(selectedMatch.id);
    const competitorsList = Object.values(competitors);

    // Validate resolution data
    if (isF1) {
      const totalPositions = competitorsList.length;
      if (Object.keys(f1Rankings).length !== totalPositions) {
        setError('Please assign all competitors to finishing positions.');
        return;
      }
    } else {
      if (!standardWinner) {
        setError('Please select the match winner.');
        return;
      }
    }

    setIsResolving(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare match result data
      const matchResult = isF1 
        ? Object.fromEntries(Object.entries(f1Rankings).map(([pos, competitorId]) => [competitorId, parseInt(pos)]))
        : standardWinner;

      let successfulResolutions = 0;
      let failedResolutions = 0;

      // Helper function to check wallet balance
      const checkWalletBalance = async (address: string, label: string) => {
        try {
          if (blockchainService.isConnected()) {
            const provider = new (window as any).ethers.providers.Web3Provider(window.ethereum);
            const balance = await provider.getBalance(address);
            const balanceInEth = (window as any).ethers.utils.formatEther(balance);
            console.log(`💰 BALANCE: ${label} (${address}): ${balanceInEth} CORE`);
            return balanceInEth;
          }
        } catch (error) {
          console.error(`Failed to check balance for ${label}:`, error);
        }
      };

      // Process each accepted bet
      for (const bet of acceptedBets) {
        try {
          // Determine bet winner
          const betWinnerRole = determineBetWinner(bet, isF1, matchResult);
          const winnerUsername = betWinnerRole === 'creator' 
            ? bet.creator_username 
            : bet.acceptor_username;
          
          const winnerCompetitorId = betWinnerRole === 'creator'
            ? bet.data.bet.creator.selectedCompetitorID
            : bet.data.bet.acceptor?.selectedCompetitorID;

          if (!winnerUsername || !winnerCompetitorId) {
            throw new Error(`Missing winner data for bet ${bet.id}`);
          }

          // Check balances before resolution
          console.log('💰 BALANCE CHECK: Before resolution');
          await checkWalletBalance(bet.data.bet.creator.walletAddress, `Creator (${bet.creator_username})`);
          if (bet.data.bet.acceptor?.walletAddress) {
            await checkWalletBalance(bet.data.bet.acceptor.walletAddress, `Acceptor (${bet.acceptor_username})`);
          }

          // Update bet metadata
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

          // Upload updated metadata
          const updatedMetadataURI = await supabaseService.uploadMetadata(
            bet.id, 
            updatedBetMetadata
          );

          // Resolve bet on blockchain
          console.log('🏦 BLOCKCHAIN: About to resolve bet on blockchain', {
            betId: parseInt(bet.id),
            winnerCompetitorId,
            creatorAddress: bet.data.bet.creator.walletAddress,
            acceptorAddress: bet.data.bet.acceptor?.walletAddress,
            betAmount: bet.data.bet.amount
          });
          
          const resolutionTxHash = await blockchainService.resolveBet(
            parseInt(bet.id),
            winnerCompetitorId,
            updatedMetadataURI
          );
          
          console.log('🏦 BLOCKCHAIN: Bet resolved on blockchain', {
            transactionHash: resolutionTxHash,
            betId: bet.id,
            winner: betWinnerRole
          });

          // Check balances after resolution
          console.log('💰 BALANCE CHECK: After resolution');
          await checkWalletBalance(bet.data.bet.creator.walletAddress, `Creator (${bet.creator_username})`);
          if (bet.data.bet.acceptor?.walletAddress) {
            await checkWalletBalance(bet.data.bet.acceptor.walletAddress, `Acceptor (${bet.acceptor_username})`);
          }

          // Update bet in database
          await supabaseService.updateBet(bet.id, {
            status: 'resolved',
            acceptor_username: bet.acceptor_username,
            data: updatedBetMetadata
          });

          successfulResolutions++;

        } catch (betError: any) {
          console.error(`Failed to resolve bet ${bet.id}:`, betError);
          failedResolutions++;
        }
      }

      // Show results
      if (successfulResolutions > 0) {
        const successMessage = `Successfully resolved ${successfulResolutions} bet${successfulResolutions !== 1 ? 's' : ''}` +
          (failedResolutions > 0 ? `. ${failedResolutions} bet${failedResolutions !== 1 ? 's' : ''} failed.` : '.') +
          ` Check console for detailed blockchain logs including transaction hashes and balance changes.`;
        
        setSuccess(successMessage);
        
        // Reset form for next resolution
        setSelectedMatchId('');
        setSelectedMatch(null);
        setAcceptedBets([]);
        setF1Rankings({});
        setStandardWinner('');
      } else {
        setError('No bets were resolved successfully.');
      }

    } catch (err: any) {
      console.error('Match resolution failed:', err);
      setError(err.message || 'Failed to resolve match. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  /**
   * Get available competitors for F1 position dropdown
   */
  const getAvailableF1Competitors = (currentPosition: number) => {
    if (!selectedMatch) return [];
    
    const competitors = matchDataService.getMatchCompetitors(selectedMatch.id);
    const competitorsList = Object.values(competitors);
    const assignedCompetitors = Object.values(f1Rankings).filter(id => id !== f1Rankings[currentPosition]);
    
    return competitorsList.filter(competitor => 
      !assignedCompetitors.includes(competitor.id)
    );
  };

  /**
   * Get ordinal number (1st, 2nd, 3rd, etc.)
   */
  const getOrdinalNumber = (num: number): string => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const value = num % 100;
    return num + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
  };

  // Check if resolution can proceed
  const canResolve = selectedMatch && acceptedBets.length > 0 && !isLoadingBets && !isResolving;
  const isF1Match = selectedMatch ? matchDataService.isF1Match(selectedMatch.id) : false;
  
  // Check blockchain connection status (use state for real-time updates)
  const isWalletConnected = walletConnected && blockchainService.isConnected();
  const currentUser = blockchainService.getCurrentUser();

  return (
    <div 
      className="match-resolution-container"
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated background using Squares component */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0
        }}
      >
        <Squares direction="diagonal" speed={0.5} borderColor="#7f1d1d" squareSize={48} hoverFillColor="#2a0a0a" className="w-full h-full" />
      </div>
      {/* Dark overlay for better text readability */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(10, 10, 15, 0.3), rgba(10, 10, 15, 0.8))',
          zIndex: 1
        }}
      />
      
      {/* Content container */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: 'min(90vw, 720px)',
        margin: '0 auto',
        padding: 'var(--spacing-xl) var(--spacing-lg)'
      }}>
        {/* Header Banner Card */}
        <div className="header-banner-card" style={{
          maxWidth: 'min(90vw, 720px)',
          width: '100%',
          margin: '0 auto var(--spacing-lg) auto'
        }}>
          {/* Red Header Bar */}
          <div style={{
            background: '#DB0004',
            padding: '12px 16px',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px'
          }}>
            <span style={{
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              MATCH RESOLUTION
            </span>
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
              Select a match to resolve and set the final results to distribute bet winnings.
            </p>
          </div>
        </div>
        
        {/* Wallet Status Banner Card */}
        <div className="wallet-status-banner-card" style={{
          maxWidth: 'min(90vw, 720px)',
          width: '100%',
          margin: '0 auto var(--spacing-lg) auto'
        }}>
          {/* Status Header Bar */}
          <div style={{
            background: isWalletConnected ? '#10b981' : '#DB0004',
            padding: '12px 16px',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px'
          }}>
            <span style={{
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {isWalletConnected ? '✅ WALLET CONNECTED' : '❌ WALLET DISCONNECTED'}
            </span>
          </div>
          
          {/* Black Content Area */}
          <div style={{
            background: '#000000',
            border: `1px solid ${isWalletConnected ? '#10b981' : '#DB0004'}`,
            borderTop: 'none',
            borderBottomLeftRadius: '4px',
            borderBottomRightRadius: '4px',
            padding: '16px'
          }}>
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              marginBottom: !isWalletConnected && currentUser ? 'var(--spacing-sm)' : 0
            }}>
              {currentUser ? `User: ${currentUser.username}` : 'No user authenticated'}
            </div>
            {!isWalletConnected && currentUser && (
              <button
                onClick={async () => {
                  const reconnected = await blockchainService.reconnectWallet();
                  if (!reconnected) {
                    // Force a full reconnection
                    try {
                      await blockchainService.connectWallet();
                      setWalletConnected(true);
                      // Trigger navigation component to update balance
                      window.dispatchEvent(new Event('walletReconnected'));
                    } catch (error) {
                      setError('Failed to reconnect wallet. Please try refreshing the page.');
                    }
                  } else {
                    setWalletConnected(true);
                    // Trigger navigation component to update balance
                    window.dispatchEvent(new Event('walletReconnected'));
                  }
                }}
                className="btn btn-primary"
                style={{
                  fontSize: '0.75rem',
                  padding: 'var(--spacing-xs) var(--spacing-sm)'
                }}
              >
                Reconnect Wallet
              </button>
            )}
          </div>
        </div>
        
        {/* Admin Warning Banner Card */}
        <div className="admin-warning-banner-card" style={{
          maxWidth: 'min(90vw, 720px)',
          width: '100%',
          margin: '0 auto var(--spacing-lg) auto'
        }}>
          {/* Red Header Bar */}
          <div style={{
            background: '#DB0004',
            padding: '12px 16px',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px'
          }}>
            <span style={{
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              ⚠️ ADMIN ONLY
            </span>
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
              This action will resolve bets and distribute funds on the blockchain. 
              Ensure match results are final before proceeding.
            </p>
          </div>
        </div>

      {/* Error/Success Messages */}
      {error && (
        <div 
          className="error-message mb-lg"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--accent-red)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-lg)',
            color: 'var(--accent-red)'
          }}
        >
          <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Error</h4>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {success && (
        <div 
          className="success-message mb-lg"
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid var(--accent-green)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-lg)',
            color: 'var(--accent-green)'
          }}
        >
          <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Success!</h4>
          <p style={{ margin: 0 }}>{success}</p>
        </div>
      )}

        {/* Match Selection Banner Card */}
        <div className="match-selection-banner-card" style={{
          maxWidth: 'min(90vw, 720px)',
          width: '100%',
          margin: '0 auto var(--spacing-lg) auto'
        }}>
          {/* Red Header Bar */}
          <div style={{
            background: '#DB0004',
            padding: '12px 16px',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px'
          }}>
            <span style={{
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              SELECT MATCH TO RESOLVE
            </span>
          </div>
          
          {/* Black Content Area */}
          <div style={{
            background: '#000000',
            border: '1px solid #DB0004',
            borderTop: 'none',
            borderBottomLeftRadius: '4px',
            borderBottomRightRadius: '4px',
            padding: 'var(--spacing-xl)'
          }}>

        <div className="form-group mb-lg">
          <label className="form-label">Available Matches</label>
          <select
            value={selectedMatchId}
            onChange={(e) => handleMatchSelection(e.target.value)}
            disabled={isLoadingBets || isResolving}
            className="form-select"
            style={{ fontSize: '1rem' }}
          >
            <option value="">Select a match...</option>
            {availableMatches.map(match => {
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

        {/* Loading bets indicator */}
        {isLoadingBets && (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
            <span className="loading-spinner" style={{ marginRight: 'var(--spacing-sm)' }} />
            Loading bets...
          </div>
        )}

            {/* Match details when selected */}
            {selectedMatch && !isLoadingBets && (
              <div 
                className="selected-match-details"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--spacing-lg)',
                  marginTop: 'var(--spacing-lg)'
                }}
              >
                <h4 style={{ color: 'var(--text-accent)', marginBottom: 'var(--spacing-md)' }}>
                  {selectedMatch.title}
                </h4>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                  {selectedMatch.subtitle}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <strong>Type:</strong> {isF1Match ? 'F1 Race (Ranking-based)' : '1v1 Match (Winner-based)'}
                  <br />
                  <strong>Accepted Bets:</strong> {acceptedBets.length} bet{acceptedBets.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Resolution Form Banner Card */}
        {selectedMatch && acceptedBets.length > 0 && !isLoadingBets && (
          <div className="resolution-form-banner-card" style={{
            maxWidth: 'min(90vw, 720px)',
            width: '100%',
            margin: '0 auto'
          }}>
            {/* Red Header Bar */}
            <div style={{
              background: '#DB0004',
              padding: '12px 16px',
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px'
            }}>
              <span style={{
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {isF1Match ? 'SET F1 RACE RESULTS' : 'SELECT MATCH WINNER'}
              </span>
            </div>
            
            {/* Black Content Area */}
            <div style={{
              background: '#000000',
              border: '1px solid #DB0004',
              borderTop: 'none',
              borderBottomLeftRadius: '4px',
              borderBottomRightRadius: '4px',
              padding: 'var(--spacing-xl)'
            }}>
            {isF1Match ? (
              // F1 Resolution Form
              <>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>
                  Assign each racer to their final finishing position in the race.
                </p>

              {/* F1 Position Assignments */}
              <div 
                className="f1-positions"
                style={{
                  display: 'grid',
                  gap: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-lg)'
                }}
              >
                {(() => {
                  const competitors = matchDataService.getMatchCompetitors(selectedMatch.id);
                  const competitorsList = Object.values(competitors);
                  
                  return Array.from({ length: competitorsList.length }, (_, index) => {
                    const position = index + 1;
                    const availableCompetitors = getAvailableF1Competitors(position);
                    
                    return (
                      <div key={position} className="position-assignment">
                        <label className="form-label" style={{ fontWeight: '600' }}>
                          {getOrdinalNumber(position)} Place
                        </label>
                        <select
                          value={f1Rankings[position] || ''}
                          onChange={(e) => handleF1RankingChange(position, e.target.value)}
                          disabled={isResolving}
                          className="form-select"
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
                  });
                })()}
              </div>
              </>
            ) : (
              // Standard Resolution Form
              <>

              <div 
                className="winner-selection"
                style={{
                  display: 'grid',
                  gap: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-lg)'
                }}
              >
                {(() => {
                  const competitors = matchDataService.getMatchCompetitors(selectedMatch.id);
                  return Object.values(competitors).map(competitor => (
                    <label
                      key={competitor.id}
                      className="competitor-option"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-md)',
                        padding: 'var(--spacing-lg)',
                        background: standardWinner === competitor.id ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                        border: standardWinner === competitor.id ? '2px solid var(--accent-green)' : '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="matchWinner"
                        value={competitor.id}
                        checked={standardWinner === competitor.id}
                        onChange={(e) => setStandardWinner(e.target.value)}
                        disabled={isResolving}
                        style={{ width: '20px', height: '20px' }}
                      />
                      
                      <img
                        src={competitor.imageURL}
                        alt={competitor.name}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      />
                      
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {competitor.name}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {competitor.abbreviation}
                        </div>
                      </div>
                      
                      {standardWinner === competitor.id && (
                        <div style={{
                          marginLeft: 'auto',
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
                  ));
                })()}
              </div>
              </>
            )}

            {/* Resolve Button */}
            <button
              onClick={handleResolveMatch}
              disabled={!canResolve || (isF1Match ? Object.keys(f1Rankings).length === 0 : !standardWinner)}
              className="btn btn-primary btn-large w-full glow-strong"
              style={{
                opacity: canResolve ? 1 : 0.5,
                cursor: canResolve ? 'pointer' : 'not-allowed',
                marginTop: 'var(--spacing-lg)'
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchResolutionView;














