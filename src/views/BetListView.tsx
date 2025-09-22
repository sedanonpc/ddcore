import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseService } from '../services/supabase';
import { blockchainService } from '../services/blockchain';
import { DatabaseBet } from '../types';
import BetListItemView from '../components/BetListItemView';
import BetAcceptanceView from '../components/BetAcceptanceView';
import { Squares } from '../components/Squares';
import { ReactComponent as HellracerBanner } from '../assets/images/hellracer banner 2.svg';
import '../styles/cyberpunk.css';

/**
 * BetListView Component
 * Displays list of open bets available for acceptance
 * Allows filtering and searching through available bets
 */
const BetListView: React.FC = () => {
  const [bets, setBets] = useState<DatabaseBet[]>([]);
  const [selectedBet, setSelectedBet] = useState<DatabaseBet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const user = blockchainService.getCurrentUser();
    if (!user) {
      navigate('/');
      return;
    }

    loadAllBets();
  }, [navigate]);

  /**
   * Load all bets from the database
   */
  const loadAllBets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const allBets = await supabaseService.getAllBets();
      setBets(allBets);
    } catch (err: any) {
      console.error('Failed to load bets:', err);
      setError(err.message || 'Failed to load bets. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Filter bets based on search query, league selection, and status
   */
  const filteredBets = bets.filter(bet => {
    const currentUser = blockchainService.getCurrentUser();

    // Filter by league
    if (selectedLeague !== 'all' && bet.data.league.id !== selectedLeague) {
      return false;
    }

    // Filter by status
    if (selectedStatus !== 'all' && bet.status !== selectedStatus) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = bet.data.match.title.toLowerCase().includes(query);
      const matchesSubtitle = bet.data.match.subtitle.toLowerCase().includes(query);
      const matchesCreator = bet.creator_username.toLowerCase().includes(query);
      
      // Search in competitor names
      const matchesCompetitors = Object.values(bet.data.matchCompetitors).some(competitor =>
        competitor.name.toLowerCase().includes(query) ||
        competitor.abbreviation.toLowerCase().includes(query)
      );

      return matchesTitle || matchesSubtitle || matchesCreator || matchesCompetitors;
    }

    return true;
  });

  /**
   * Handle bet selection for acceptance
   */
  const handleBetSelect = (bet: DatabaseBet) => {
    setSelectedBet(bet);
  };

  /**
   * Close bet acceptance modal
   */
  const closeBetAcceptance = () => {
    setSelectedBet(null);
  };

  /**
   * Handle successful bet acceptance
   */
  const handleBetAccepted = () => {
    setSelectedBet(null);
    // Reload bets to reflect changes
    loadAllBets();
  };

  /**
   * Get unique leagues for filter dropdown
   */
  const getAvailableLeagues = () => {
    const leagues = bets.map(bet => bet.data.league);
    const uniqueLeagues = leagues.filter((league, index, self) => 
      index === self.findIndex(l => l.id === league.id)
    );
    return uniqueLeagues;
  };

  /**
   * Refresh bets list
   */
  const handleRefresh = () => {
    loadAllBets();
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner-large" />
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>
          Loading All Bets
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Fetching betting history and opportunities...
        </p>
      </div>
    );
  }

  return (
    <div 
      className="bet-list-container"
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
        {/* Hellracer Banner */}
        <div style={{
          maxWidth: 'min(90vw, 720px)',
          width: '100%',
          margin: 'calc(-0.5 * var(--spacing-xl)) auto var(--spacing-lg) auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <HellracerBanner
            style={{
              width: '100%',
              maxWidth: '720px',
              height: 'auto',
              display: 'block',
              imageRendering: 'crisp-edges',
              shapeRendering: 'crispEdges',
              textRendering: 'geometricPrecision'
            }}
          />
        </div>

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
              ALL BETS
            </span>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.875rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                padding: '4px 8px',
                borderRadius: '2px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {isLoading ? '⏳' : '🔄'} REFRESH
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
              View all bets, accept open challenges, and track bet history
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
            color: 'var(--accent-red)'
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            {error}
          </p>
          <button
            onClick={handleRefresh}
            className="btn btn-small mt-sm"
            style={{ background: 'var(--accent-red)' }}
          >
            Try Again
          </button>
        </div>
      )}

        {/* Filters Banner Card */}
        <div className="filters-banner-card" style={{
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
              FILTERS
            </span>
          </div>
          
          {/* Black Content Area */}
          <div style={{
            background: '#000000',
            border: '1px solid #DB0004',
            borderTop: 'none',
            borderBottomLeftRadius: '4px',
            borderBottomRightRadius: '4px',
            padding: 'var(--spacing-lg)',
            display: 'flex',
            gap: 'var(--spacing-md)',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
        {/* Search Input */}
        <div className="search-container" style={{ flex: '1', minWidth: '250px' }}>
          <input
            type="text"
            placeholder="Search bets, matches, or creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ margin: 0 }}
          />
        </div>

        {/* League Filter */}
        <div className="league-filter" style={{ minWidth: '150px' }}>
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
            className="form-select"
            style={{ margin: 0 }}
          >
            <option value="all">All Leagues</option>
            {getAvailableLeagues().map(league => (
              <option key={league.id} value={league.id}>
                {league.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="status-filter" style={{ minWidth: '150px' }}>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="form-select"
            style={{ margin: 0 }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="accepted">Accepted</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

            {/* Results Count */}
            <div 
              className="results-count"
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap'
              }}
            >
              {filteredBets.length} bet{filteredBets.length !== 1 ? 's' : ''} available
            </div>
          </div>
        </div>

        {/* Bet List */}
        {filteredBets.length > 0 ? (
          <div 
            className="bet-grid"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-lg)'
            }}
          >
            {filteredBets.map(bet => (
              <BetListItemView
                key={bet.id}
                bet={bet}
                onSelect={() => handleBetSelect(bet)}
              />
            ))}
          </div>
        ) : (
          <div className="no-bets-banner-card" style={{
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
                NO BETS FOUND
              </span>
            </div>
            
            {/* Black Content Area */}
            <div style={{
              background: '#000000',
              border: '1px solid #DB0004',
              borderTop: 'none',
              borderBottomLeftRadius: '4px',
              borderBottomRightRadius: '4px',
              padding: 'var(--spacing-2xl)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                {error ? 'Unable to load bets' : 'No bets found'}
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>
                {error 
                  ? 'There was an error loading the bets. Please try refreshing.'
                  : searchQuery || selectedLeague !== 'all' || selectedStatus !== 'all'
                    ? 'Try adjusting your search criteria or filters'
                    : 'No bets are currently available. Check back later or create your own bet!'
                }
              </p>
              
              {(searchQuery || selectedLeague !== 'all' || selectedStatus !== 'all') && !error && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedLeague('all');
                    setSelectedStatus('all');
                  }}
                  className="btn btn-secondary mb-md"
                >
                  Clear Filters
                </button>
              )}
              
              <button
                onClick={() => navigate('/matches')}
                className="btn btn-primary"
              >
                Create New Bet
              </button>
            </div>
          </div>
        )}

        {/* Bet Acceptance Modal */}
        {selectedBet && (
          <BetAcceptanceView
            bet={selectedBet}
            onClose={closeBetAcceptance}
            onBetAccepted={handleBetAccepted}
          />
        )}
      </div>

    </div>
  );
};

export default BetListView;
