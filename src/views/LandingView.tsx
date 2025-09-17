import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { blockchainService } from '../services/blockchain';
import '../styles/cyberpunk.css';

/**
 * LandingView Component
 * Full-page landing screen with Daredevil branding and MetaMask connection
 * Hidden navigation bar as specified in requirements
 */
const LandingView: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
      {/* Full-page background image */}
      <div 
        className="landing-background"
        style={{
          backgroundImage: 'url(https://i.ibb.co/JRf70N7Z/daredevil-png.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: 'var(--spacing-xl)',
          position: 'relative'
        }}
      >
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
        
        {/* Content container */}
        <div 
          className="landing-content"
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            marginBottom: 'var(--spacing-2xl)'
          }}
        >
          {/* App branding */}
          <div className="landing-branding mb-lg">
            <h1 
              className="text-glow"
              style={{
                fontSize: '3rem',
                marginBottom: 'var(--spacing-md)',
                textShadow: '0 0 20px var(--accent-cyan)'
              }}
            >
              {process.env.REACT_APP_MARKETING_NAME || 'Daredevil'}
            </h1>
            <p 
              style={{
                fontSize: '1.25rem',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-xl)',
                maxWidth: '600px'
              }}
            >
              The ultimate Web3 sports betting experience. 
              Dare to predict. Dare to win. Dare to be legendary.
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
              Powered by Core Blockchain TestNet2
            </p>
          </div>
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


