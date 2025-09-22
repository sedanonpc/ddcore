import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { blockchainService } from '../services/blockchain';
import { User } from '../types';
import { ReactComponent as DDLogo } from '../assets/images/dd svg.svg';
import '../styles/cyberpunk.css';

/**
 * NavigationView Component
 * Responsive navigation bar with hamburger menu for mobile
 * Hidden on LandingView as specified in requirements
 */
const NavigationView: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [balance, setBalance] = useState<string>('0.0');
  const location = useLocation();
  const navigate = useNavigate();

  // Hide navigation on landing page
  const isLandingPage = location.pathname === '/';

  useEffect(() => {
    // Get current user from localStorage
    const currentUser = blockchainService.getCurrentUser();
    setUser(currentUser);

    // Get user balance if connected and provider is initialized
    if (currentUser && blockchainService.isConnected()) {
      loadBalance();
    }
  }, [location]);

  // Listen for wallet reconnection events
  useEffect(() => {
    const handleWalletReconnected = () => {
      const currentUser = blockchainService.getCurrentUser();
      setUser(currentUser);
      if (currentUser && blockchainService.isConnected()) {
        loadBalance();
      }
    };

    window.addEventListener('walletReconnected', handleWalletReconnected);
    
    return () => {
      window.removeEventListener('walletReconnected', handleWalletReconnected);
    };
  }, []);

  /**
   * Load user's wallet balance
   */
  const loadBalance = async () => {
    try {
      if (!blockchainService.isConnected()) {
        // Provider not initialized, skip balance loading
        return;
      }
      const userBalance = await blockchainService.getBalance();
      setBalance(parseFloat(userBalance).toFixed(4));
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  /**
   * Handle user logout
   */
  const handleLogout = () => {
    blockchainService.disconnect();
    setUser(null);
    setIsMenuOpen(false);
    navigate('/');
  };

  /**
   * Toggle mobile menu
   */
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  /**
   * Close mobile menu when link is clicked
   */
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Don't render navigation on landing page
  if (isLandingPage) {
    return null;
  }

  // Don't render if user is not connected
  if (!user) {
    return null;
  }

  return (
    <nav className="navbar" style={{
      background: 'var(--bg-primary)',
      borderBottom: '1px solid #DB0004',
      padding: 'var(--spacing-md) 0'
    }}>
      <div 
        className="navbar-container"
        style={{
          maxWidth: 'min(90vw, 720px)',
          margin: '0 auto',
          padding: '0 var(--spacing-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Brand/Logo */}
        <Link 
          to="/matches" 
          className="navbar-brand"
          onClick={closeMenu}
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <DDLogo
            style={{
              width: '120px',
              height: 'auto'
            }}
          />
        </Link>

        {/* Desktop Navigation */}
        <div 
          className="navbar-nav desktop-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-lg)'
          }}
        >
          <Link
            to="/matches"
            className={`nav-link ${location.pathname === '/matches' ? 'active' : ''}`}
          >
            Matches
          </Link>
          
          <Link
            to="/bets"
            className={`nav-link ${location.pathname === '/bets' ? 'active' : ''}`}
          >
            Bets
          </Link>

          {/* User Info */}
          <div 
            className="user-info"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              marginLeft: 'var(--spacing-lg)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: '#000000',
              borderRadius: '4px',
              border: '1px solid #DB0004'
            }}
          >
            <div className="user-details">
              <div 
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}
              >
                {user.username}
              </div>
              <div 
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}
              >
                {balance} {process.env.REACT_APP_CORE_NATIVE_CURRENCY_SYMBOL || 'tCORE2'}
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              style={{
                background: '#DB0004',
                color: '#ffffff',
                border: 'none',
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                fontSize: '0.75rem',
                borderRadius: '2px',
                cursor: 'pointer',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="mobile-menu-button"
          onClick={toggleMenu}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: 'var(--spacing-sm)'
          }}
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div 
            className="mobile-nav"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--bg-modal)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border-primary)',
              borderTop: 'none',
              padding: 'var(--spacing-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-md)',
              zIndex: 800
            }}
          >
            <Link
              to="/matches"
              className={`nav-link ${location.pathname === '/matches' ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Matches
            </Link>
            
            <Link
              to="/bets"
              className={`nav-link ${location.pathname === '/bets' ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Bets
            </Link>

            {/* Mobile User Info */}
            <div 
              className="mobile-user-info"
              style={{
                padding: 'var(--spacing-md)',
                background: '#000000',
                borderRadius: '4px',
                border: '1px solid #DB0004',
                marginTop: 'var(--spacing-md)'
              }}
            >
              <div 
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--spacing-xs)'
                }}
              >
                {user.username}
              </div>
              <div 
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  marginBottom: 'var(--spacing-md)'
                }}
              >
                Balance: {balance} {process.env.REACT_APP_CORE_NATIVE_CURRENCY_SYMBOL || 'tCORE2'}
              </div>
              
              <button
                onClick={handleLogout}
                style={{
                  background: '#DB0004',
                  color: '#ffffff',
                  border: 'none',
                  padding: 'var(--spacing-sm)',
                  fontSize: '0.875rem',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  width: '100%'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile styles are handled in the cyberpunk.css file */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          
          .mobile-menu-button {
            display: block !important;
          }
        }
        
        @media (min-width: 769px) {
          .mobile-nav {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
};

export default NavigationView;
