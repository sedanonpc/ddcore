import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { blockchainService } from '../services/blockchain';
import { Squares } from '../components/Squares';
import FeaturedMatchCard from '../components/FeaturedMatchCard';
import F1NewsTicker from '../components/F1NewsTicker';
import F1MediaPlayer from '../components/F1MediaPlayer';
import MobileWalletConnection from '../components/MobileWalletConnection';
import { ReactComponent as AgentBannerTitle } from '../assets/images/Agent hellracer banner title.svg';
import { matchDataService } from '../utils/matchData';
import { Match, League, Competitor, User } from '../types';
import { isMobileDevice } from '../utils/mobileWallet';
import '../styles/cyberpunk.css';

/**
 * LandingView Component
 * Full-page landing screen with Daredevil branding and MetaMask connection
 * Hidden navigation bar as specified in requirements
 */
const LandingView: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [featuredMatch, setFeaturedMatch] = useState<{
    match: Match;
    league: League;
    competitors: Record<string, Competitor>;
  } | null>(null);
  const navigate = useNavigate();

  /**
   * Detect mobile device and check for pending connections
   */
  useEffect(() => {
    // Temporarily disable mobile detection to force desktop UI
    setIsMobile(false);
    
    // Check for pending wallet connection (after deep link redirect)
    const checkPendingConnection = async () => {
      try {
        const hasPending = await blockchainService.checkPendingConnection();
        if (hasPending) {
          const user = blockchainService.getCurrentUser();
          if (user) {
            navigate('/matches');
          }
        }
      } catch (error) {
        console.error('Failed to check pending connection:', error);
      }
    };

    checkPendingConnection();
  }, [navigate]);

  /**
   * Load the next upcoming F1 match for the featured section
   */
  useEffect(() => {
    const loadFeaturedMatch = () => {
      try {
        // Get all matches and filter for F1 only
        const allMatches = matchDataService.getAllMatches();
        const f1Matches = allMatches.filter(match => {
          const league = matchDataService.getLeague(match.leagueID);
          return league && league.name.toLowerCase().includes('formula 1');
        });
        
        const now = new Date();
        
        // Find the next F1 match that's scheduled after now
        const nextMatch = f1Matches.find(match => {
          const matchDate = new Date(match.scheduledDateInUTC);
          return matchDate > now;
        });
        
        if (nextMatch) {
          const league = matchDataService.getLeague(nextMatch.leagueID);
          const competitors = matchDataService.getMatchCompetitors(nextMatch.id);
          
          if (league) {
            setFeaturedMatch({
              match: nextMatch,
              league,
              competitors
            });
          }
        } else {
          // Fallback: if no future F1 matches, show the most recent F1 match
          const mostRecentMatch = f1Matches[0];
          if (mostRecentMatch) {
            const league = matchDataService.getLeague(mostRecentMatch.leagueID);
            const competitors = matchDataService.getMatchCompetitors(mostRecentMatch.id);
            
            if (league) {
              setFeaturedMatch({
                match: mostRecentMatch,
                league,
                competitors
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to load featured F1 match:', error);
      }
    };

    loadFeaturedMatch();
  }, []);

  /**
   * Position Featured Match bar right below the invisible divider
   */
  useEffect(() => {
    const positionFeaturedMatch = () => {
      const divider = document.getElementById('svg-header-divider');
      const featuredSection = document.querySelector('.featured-matches-section') as HTMLElement;
      
      if (divider && featuredSection) {
        const dividerRect = divider.getBoundingClientRect();
        const dividerBottom = dividerRect.bottom;
        
        // Position the Featured Match section right below the divider
        featuredSection.style.top = `${dividerBottom}px`;
      }
    };

    // Position on load and resize
    positionFeaturedMatch();
    window.addEventListener('resize', positionFeaturedMatch);
    
    return () => {
      window.removeEventListener('resize', positionFeaturedMatch);
    };
  }, [featuredMatch]);



  /**
   * Handle wallet connection success
   */
  const handleWalletConnected = (user: User) => {
    console.log('Wallet connected successfully:', user);
    setIsConnecting(false);
    setError(null);
    navigate('/matches');
  };

  /**
   * Handle wallet connection failure
   */
  const handleConnectionFailed = (errorMessage: string) => {
    console.error('Wallet connection failed:', errorMessage);
    setError(errorMessage);
    setIsConnecting(false);
  };

  /**
   * Handle MetaMask wallet connection (legacy desktop method)
   * Generates username and stores user data in localStorage
   */
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check if MetaMask is installed
      if (!blockchainService.isMetaMaskInstalled()) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Connect to wallet and get user data
      const user = await blockchainService.connectWallet();
      
      console.log('Wallet connected successfully:', user);
      
      // Navigate to match list after successful connection
      navigate('/matches');
      
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="landing-container">
      {/* Full-page animated background using Squares component */}
      <div 
        className="landing-background"
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--spacing-xs) var(--spacing-sm)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0
          }}
        >
          <Squares direction="diagonal" speed={0.5} borderColor="#7f1d1d" squareSize={48} hoverFillColor="#1a0b0b" className="w-full h-full" />
        </div>
        {/* Dark overlay for better text readability */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to bottom, rgba(10, 10, 15, 0.3), rgba(10, 10, 15, 0.8))',
            zIndex: 1
          }}
        />

        {/* Header spacing - using document flow */}
        <div
          style={{
            height: 'auto',
            paddingTop: '0',
            paddingBottom: '0',
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 2,
            flexShrink: 0
          }}
        >
          <div
            style={{
              maxWidth: 'min(95vw, 1000px)',
              width: '100%',
              height: 'auto',
              position: 'relative'
            }}
          >
            <AgentBannerTitle
              role="img"
              aria-label="Agent Hellracer"
              style={{
                maxWidth: 'min(95vw, 1000px)',
                width: '100%',
                height: 'auto',
                opacity: 1,
                pointerEvents: 'none'
              }}
            />
          </div>
        </div>

        {/* Sports Content Section - with consistent spacing */}
        <div className="sports-content-section" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 'var(--spacing-md)',
          margin: 'var(--spacing-sm) auto',
          maxWidth: 'min(95vw, 1000px)',
          width: '100%',
          flex: 1,
          justifyContent: 'space-evenly',
          overflow: 'visible'
        }}>
          {/* F1 News Ticker - Wide Width */}
          <div className="ticker-desktop-position" style={{ 
            position: 'relative', 
            zIndex: 3,
            maxWidth: 'min(95vw, 1000px)',
            width: '100%',
            margin: '0 auto'
          }}>
            <F1NewsTicker className="landing-f1-ticker" />
          </div>

          {/* Featured Matches Section - Narrow Width */}
          {featuredMatch && (
            <div className="featured-matches-section" style={{ 
              maxWidth: 'min(60vw, 600px)',
              width: '100%',
              margin: '0 auto'
            }}>
              <FeaturedMatchCard
                match={featuredMatch.match}
                league={featuredMatch.league}
                competitors={featuredMatch.competitors}
              />
            </div>
          )}
        </div>



        {/* Content container */}
        <div 
          className="landing-content"
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            maxWidth: 'min(95vw, 1000px)',
            width: '100%',
            margin: '0 auto',
            flexShrink: 0
          }}
        >
          {/* App branding */}
          <div className="landing-branding mb-lg">
            <p 
              style={{
                fontSize: '1rem',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-xs)',
                maxWidth: 'min(95vw, 1000px)',
                margin: '0 auto var(--spacing-xs) auto'
              }}
            >
              
              Dare to predict. Dare to win. <span style={{ color: '#FFD700' }}>Dare to be legendary.</span>
            </p>
          </div>

          {/* Wallet Connection */}
          <div className="landing-actions">
            {isMobile ? (
              <MobileWalletConnection
                onWalletConnected={handleWalletConnected}
                onConnectionFailed={handleConnectionFailed}
                className="mobile-wallet-connection"
              />
            ) : (
              <>
                <button
                  className="btn btn-primary btn-large glow-strong"
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  style={{
                    fontSize: '1rem',
                    padding: 'var(--spacing-sm) var(--spacing-lg)',
                    minWidth: '220px',
                    position: 'relative'
                  }}
                >
                  {isConnecting ? (
                    <>
                      <span className="loading-spinner" style={{ marginRight: 'var(--spacing-sm)' }} />
                      Connecting...
                    </>
                  ) : (
                    'Login with MetaMask'
                  )}
                </button>

                {/* Error message */}
                {error && (
                  <div 
                    className="error-message mt-lg"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid var(--accent-red)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--spacing-md)',
                      color: 'var(--accent-red)',
                      maxWidth: '400px',
                      margin: '0 auto'
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                      {error}
                    </p>
                  </div>
                )}

                {/* MetaMask installation hint */}
                {!blockchainService.isMetaMaskInstalled() && (
                  <div 
                    className="metamask-hint mt-lg"
                    style={{
                      background: 'rgba(0, 210, 255, 0.1)',
                      border: '1px solid var(--accent-cyan)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--spacing-md)',
                      color: 'var(--text-secondary)',
                      maxWidth: '400px',
                      margin: '0 auto'
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                      Don't have MetaMask? 
                      <a 
                        href="https://metamask.io/download/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--accent-cyan)',
                          textDecoration: 'none',
                          marginLeft: 'var(--spacing-xs)'
                        }}
                      >
                        Install it here
                      </a>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Network information */}
          <div 
            className="network-info"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.65rem',
              opacity: 0.8,
              marginTop: 0
            }}
          >
            <p style={{ margin: 1 }}>
              v1.01 Core Blockchain TestNet2
            </p>
          </div>
        </div>


        {/* F1 Media Player - positioned below bottom text */}
        <div className="f1-media-player-container" style={{ 
          display: 'flex', 
          justifyContent: 'center',
          margin: 'var(--spacing-xs) auto var(--spacing-lg) auto',
          maxWidth: 'min(95vw, 1000px)',
          width: '100%',
          flexShrink: 0
        }}>
          <F1MediaPlayer className="landing-f1-media" videoId="in03rYd74NU" />
        </div>

        {/* Copyright Footer */}
        <div style={{
          position: 'absolute',
          bottom: 'var(--spacing-xs)',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'var(--text-muted)',
          fontSize: '0.55rem',
          opacity: 0.6,
          zIndex: 2,
          textAlign: 'center',
          whiteSpace: 'nowrap'
        }}>
          All Rights Reserved - New Prontera Corporation™ 2025
        </div>
      </div>

      {/* Mobile-specific styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (max-width: 768px) {
            .landing-background {
              height: 100vh !important;
              padding: 8px 12px !important;
              justify-content: flex-start !important;
            }
            
            .sports-content-section {
              gap: 16px !important;
              margin: 16px auto !important;
              flex: 0 1 auto !important;
              justify-content: center !important;
            }
            
            .landing-content {
              margin: 16px auto !important;
              flex: 0 1 auto !important;
            }
            
            .f1-media-player-container {
              margin: 16px auto !important;
              flex: 0 1 auto !important;
            }
            
            .landing-branding p {
              margin: 8px auto !important;
              font-size: 14px !important;
            }
            
            .btn {
              padding: 12px 24px !important;
              font-size: 14px !important;
              margin: 8px auto !important;
            }
            
            .network-info {
              margin-top: 4px !important;
              font-size: 11px !important;
            }
          }
        `
      }} />

      {/* Loading overlay for connection process */}
      {isConnecting && (
        <div className="loading-overlay">
          <div className="loading-spinner-large" />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>
            Connecting to MetaMask
          </h3>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            Please approve the connection request in your MetaMask wallet
          </p>
        </div>
      )}
    </div>
  );
};

export default LandingView;


