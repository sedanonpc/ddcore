import React, { useState, useEffect } from 'react';
import { blockchainService } from '../services/blockchain';
import { 
  detectMobileWalletConnection, 
  getConnectionInstructions, 
  getWalletDownloadLinks,
  isMobileDevice 
} from '../utils/mobileWallet';
import { User } from '../types';
import './MobileWalletConnection.css';

interface MobileWalletConnectionProps {
  onWalletConnected?: (user: User) => void;
  onConnectionFailed?: (error: string) => void;
  className?: string;
}

/**
 * Mobile Wallet Connection Component
 * Handles wallet connection with mobile-specific UI and deep linking
 */
const MobileWalletConnection: React.FC<MobileWalletConnectionProps> = ({
  onWalletConnected,
  onConnectionFailed,
  className = ''
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [detection, setDetection] = useState<any>(null);
  const [instructions, setInstructions] = useState<any>(null);

  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    
    if (mobile) {
      const walletDetection = detectMobileWalletConnection();
      setDetection(walletDetection);
      
      const connectionInstructions = getConnectionInstructions();
      setInstructions(connectionInstructions);
    }
  }, []);

  // Check for pending connection when component mounts
  useEffect(() => {
    const checkPendingConnection = async () => {
      try {
        const hasPending = await blockchainService.checkPendingConnection();
        if (hasPending) {
          const user = blockchainService.getCurrentUser();
          if (user && onWalletConnected) {
            onWalletConnected(user);
          }
        }
      } catch (error) {
        console.error('Failed to check pending connection:', error);
      }
    };

    checkPendingConnection();
  }, [onWalletConnected]);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      console.log('🔗 Starting wallet connection...');
      const user = await blockchainService.connectWallet();
      
      if (onWalletConnected) {
        onWalletConnected(user);
      }
      
      console.log('✅ Wallet connected successfully');
    } catch (error: any) {
      console.error('❌ Wallet connection failed:', error);
      const errorMessage = error.message || 'Failed to connect wallet';
      setConnectionError(errorMessage);
      
      if (onConnectionFailed) {
        onConnectionFailed(errorMessage);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDownloadMetaMask = () => {
    const wallets = getWalletDownloadLinks();
    const metaMask = wallets.find(w => w.name === 'MetaMask');
    
    if (metaMask) {
      window.open(metaMask.downloadUrl, '_blank');
    }
  };

  if (!isMobile) {
    // Desktop connection UI
    return (
      <div className={`wallet-connection desktop ${className}`}>
        <div className="connection-card">
          <div className="connection-header">
            <h3>🔗 Connect MetaMask</h3>
            <p>Connect your wallet to start betting</p>
          </div>
          
          <button 
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className="connect-button primary"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
          
          {connectionError && (
            <div className="error-message">
              <p>❌ {connectionError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mobile connection UI
  return (
    <div className={`wallet-connection mobile ${className}`}>
      <div className="connection-card">
        <div className="connection-header">
          <h3>📱 {instructions?.title || 'Connect Wallet'}</h3>
          <p>Connect your mobile wallet to start betting</p>
        </div>

        {detection?.hasWallet ? (
          // MetaMask is installed
          <div className="connection-content">
            <div className="wallet-info">
              <div className="wallet-icon">🦊</div>
              <div className="wallet-details">
                <h4>MetaMask Detected</h4>
                <p>Ready to connect</p>
              </div>
            </div>

            <div className="connection-steps">
              {instructions?.steps.map((step: string, index: number) => (
                <div key={index} className="step">
                  <span className="step-number">{index + 1}</span>
                  <span className="step-text">{step}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="connect-button primary large"
            >
              {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          </div>
        ) : (
          // MetaMask not installed
          <div className="connection-content">
            <div className="wallet-info">
              <div className="wallet-icon">🦊</div>
              <div className="wallet-details">
                <h4>MetaMask Not Found</h4>
                <p>Download and install MetaMask first</p>
              </div>
            </div>

            <div className="connection-steps">
              {instructions?.steps.map((step: string, index: number) => (
                <div key={index} className="step">
                  <span className="step-number">{index + 1}</span>
                  <span className="step-text">{step}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={handleDownloadMetaMask}
              className="download-button secondary large"
            >
              📥 Download MetaMask
            </button>

            <button 
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="connect-button primary large"
              style={{ marginTop: '10px' }}
            >
              {isConnecting ? 'Connecting...' : 'I Have MetaMask'}
            </button>
          </div>
        )}

        {connectionError && (
          <div className="error-message">
            <p>❌ {connectionError}</p>
            {connectionError.includes('Redirecting to MetaMask') && (
              <p className="redirect-note">
                💡 After connecting in MetaMask, return to this app to complete the connection.
              </p>
            )}
          </div>
        )}

        <div className="alternative-wallets">
          <p className="alternative-title">Other Mobile Wallets:</p>
          <div className="wallet-list">
            {getWalletDownloadLinks().slice(1).map((wallet, index) => (
              <button
                key={index}
                onClick={() => window.open(wallet.downloadUrl, '_blank')}
                className="wallet-option"
              >
                <span className="wallet-icon">{wallet.icon}</span>
                <span className="wallet-name">{wallet.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default MobileWalletConnection;
