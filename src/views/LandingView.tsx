import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { blockchainService } from '../services/blockchain';
import { Squares } from '../components/Squares';
import FeaturedMatchCard from '../components/FeaturedMatchCard';
import F1QualifyingResults from '../components/F1QualifyingResults';
import F1MediaPlayer from '../components/F1MediaPlayer';
import { ReactComponent as AgentBannerTitle } from '../assets/images/Agent hellracer banner title.svg';
import { matchDataService } from '../utils/matchData';
import { Match, League, Competitor } from '../types';
import '../styles/cyberpunk.css';

/**
 * LandingView Component
 * Full-page landing screen with Daredevil branding and MetaMask connection
 * Hidden navigation bar as specified in requirements
 */
const LandingView: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featuredMatch, setFeaturedMatch] = useState<{
    match: Match;
    league: League;
    competitors: Record<string, Competitor>;
  } | null>(null);
  const navigate = useNavigate();

  /**
   * Load the next upcoming match for the featured section
   */
  useEffect(() => {
    const loadFeaturedMatch = () => {
      try {
        // Get all matches and find the next upcoming one (regardless of how far in future)
        const allMatches = matchDataService.getAllMatches();
        const now = new Date();
        
        // Find the next match that's scheduled after now
        const nextMatch = allMatches.find(match => {
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
          // Fallback: if no future matches, show the most recent match
          const mostRecentMatch = allMatches[0];
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
        console.error('Failed to load featured match:', error);
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
   * Handle MetaMask wallet connection
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
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: 'var(--spacing-xl)',
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
            paddingTop: 'var(--spacing-md)',
            paddingBottom: 'var(--spacing-md)',
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 2
          }}
        >
          <div
            style={{
              maxWidth: 'min(90vw, 720px)',
              width: '100%',
              height: 'auto',
              position: 'relative'
            }}
          >
            <AgentBannerTitle
              role="img"
              aria-label="Agent Hellracer"
              style={{
                maxWidth: 'min(90vw, 720px)',
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
          gap: 'var(--spacing-lg)',
          margin: 'var(--spacing-sm) auto var(--spacing-xs) auto',
          maxWidth: 'min(90vw, 720px)',
          width: '100%'
        }}>
          {/* Featured Matches Section */}
          {featuredMatch && (
            <div className="featured-matches-section">
              <FeaturedMatchCard
                match={featuredMatch.match}
                league={featuredMatch.league}
                competitors={featuredMatch.competitors}
                allUpcomingMatches={matchDataService.getAllMatches().filter(m => {
                  const matchDate = new Date(m.scheduledDateInUTC);
                  return matchDate > new Date();
                })}
              />
            </div>
          )}

          {/* F1 Qualifying Results - positioned right after UPCOMING banner for desktop only */}
          <div className="qualifying-desktop-position">
            <F1QualifyingResults className="landing-f1-qualifying" />
          </div>
        </div>



        {/* Content container */}
        <div 
          className="landing-content"
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            marginBottom: 'var(--spacing-lg)',
            maxWidth: 'min(90vw, 720px)',
            width: '100%',
            margin: '0 auto var(--spacing-lg) auto'
          }}
        >
          {/* App branding */}
          <div className="landing-branding mb-lg">
            <p 
              style={{
                fontSize: '1.25rem',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-xl)',
                maxWidth: 'min(90vw, 720px)',
                margin: '0 auto var(--spacing-xl) auto'
              }}
            >
              
              Dare to predict. Dare to win. <span style={{ color: '#FFD700' }}>Dare to be legendary.</span>
            </p>
          </div>

          {/* Connection button */}
          <div className="landing-actions">
            <button
              className="btn btn-primary btn-large glow-strong"
              onClick={handleConnectWallet}
              disabled={isConnecting}
              style={{
                fontSize: '1.25rem',
                padding: 'var(--spacing-lg) var(--spacing-2xl)',
                minWidth: '280px',
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
          </div>

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

          {/* Network information */}
          <div 
            className="network-info mt-lg"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              opacity: 0.8
            }}
          >
            <p style={{ margin: 0 }}>
              v1.01 Core Blockchain TestNet2
            </p>
          </div>
        </div>

        {/* F1 Qualifying Results - positioned below bottom text for mobile, above for desktop */}
        <div className="qualifying-mobile-position" style={{ 
          display: 'flex', 
          justifyContent: 'center',
          margin: 'var(--spacing-lg) auto 0 auto',
          maxWidth: 'min(90vw, 720px)',
          width: '100%'
        }}>
          <F1QualifyingResults className="landing-f1-qualifying" />
        </div>

        {/* F1 Media Player - positioned below bottom text */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          margin: 'var(--spacing-xl) auto 0 auto',
          maxWidth: 'min(90vw, 720px)',
          width: '100%'
        }}>
          <F1MediaPlayer className="landing-f1-media" videoId="in03rYd74NU" />
        </div>
      </div>

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


