import React, { useState, useEffect } from 'react';
import { blockchainService } from '../services/blockchain';
import { 
  detectMobileWalletConnection, 
  getConnectionInstructions, 
  getWalletDownloadLinks,
  isMobileDevice 
} from '../utils/mobileWallet';
import { User } from '../types';

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

      <style jsx>{`
        .wallet-connection {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          padding: 20px;
        }

        .connection-card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid #333;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .connection-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .connection-header h3 {
          color: #00ff88;
          margin: 0 0 8px 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .connection-header p {
          color: #ccc;
          margin: 0;
          font-size: 0.9rem;
        }

        .wallet-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .wallet-icon {
          font-size: 2rem;
        }

        .wallet-details h4 {
          color: #fff;
          margin: 0 0 4px 0;
          font-size: 1.1rem;
        }

        .wallet-details p {
          color: #ccc;
          margin: 0;
          font-size: 0.9rem;
        }

        .connection-steps {
          margin-bottom: 24px;
        }

        .step {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
          padding: 8px 0;
        }

        .step-number {
          background: #00ff88;
          color: #000;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .step-text {
          color: #fff;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .connect-button, .download-button {
          width: 100%;
          padding: 16px 24px;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .connect-button.primary {
          background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
          color: #000;
        }

        .connect-button.primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #00cc6a 0%, #00aa55 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 255, 136, 0.3);
        }

        .connect-button.primary:disabled {
          background: #666;
          color: #999;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .download-button.secondary {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
          color: #fff;
        }

        .download-button.secondary:hover {
          background: linear-gradient(135deg, #ee5a52 0%, #dc4c48 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3);
        }

        .error-message {
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid rgba(255, 107, 107, 0.3);
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .error-message p {
          color: #ff6b6b;
          margin: 0 0 8px 0;
          font-size: 0.9rem;
        }

        .redirect-note {
          color: #00ff88 !important;
          font-size: 0.8rem;
          font-style: italic;
        }

        .alternative-wallets {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .alternative-title {
          color: #ccc;
          font-size: 0.9rem;
          margin: 0 0 12px 0;
          text-align: center;
        }

        .wallet-list {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .wallet-option {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 8px 12px;
          color: #fff;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .wallet-option:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .wallet-name {
          font-size: 0.7rem;
        }

        .desktop .connection-card {
          max-width: 350px;
        }

        .desktop .connection-header h3 {
          font-size: 1.3rem;
        }

        .desktop .connect-button {
          padding: 12px 20px;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};

export default MobileWalletConnection;
