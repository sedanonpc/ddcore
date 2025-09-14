import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseService } from '../services/supabase';
import { blockchainService } from '../services/blockchain';
import { DatabaseBet } from '../types';
import BetListItemView from '../components/BetListItemView';
import BetAcceptanceView from '../components/BetAcceptanceView';
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
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const user = blockchainService.getCurrentUser();
    if (!user) {
      navigate('/');
      return;
    }

    loadOpenBets();
  }, [navigate]);

  /**
   * Load all open bets from the database
   */
  const loadOpenBets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const openBets = await supabaseService.getOpenBets();
      setBets(openBets);
    } catch (err: any) {
      console.error('Failed to load bets:', err);
      setError(err.message || 'Failed to load bets. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Filter bets based on search query and league selection
   */
  const filteredBets = bets.filter(bet => {
    const currentUser = blockchainService.getCurrentUser();

    // Filter by league
    if (selectedLeague !== 'all' && bet.data.league.id !== selectedLeague) {
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
    loadOpenBets();
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
    loadOpenBets();
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner-large" />
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>
          Loading Open Bets
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Fetching available betting opportunities...
        </p>
      </div>
    );
  }

  return (
    <div 
      className="bet-list-container"
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'var(--spacing-xl) var(--spacing-lg)'
      }}
    >
      {/* Header */}
      <div className="bet-list-header mb-lg">
        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 'var(--spacing-md)'
          }}
        >
          <div>
            <h1 className="text-glow">Open Bets</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
              Accept a bet and dare to challenge another player
            </p>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)'
            }}
          >
            {isLoading ? (
              <span className="loading-spinner" />
            ) : (
              <span>🔄</span>
            )}
            Refresh
          </button>
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

      {/* Filters */}
      <div 
        className="bet-filters mb-lg"
        style={{
          display: 'flex',
          gap: 'var(--spacing-md)',
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: 'var(--spacing-lg)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-primary)'
        }}
      >
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

      {/* Bet List */}
      {filteredBets.length > 0 ? (
        <div 
          className="bet-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
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
        <div 
          className="no-bets"
          style={{
            textAlign: 'center',
            padding: 'var(--spacing-2xl)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-primary)'
          }}
        >
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
            {error ? 'Unable to load bets' : 'No open bets found'}
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>
            {error 
              ? 'There was an error loading the bets. Please try refreshing.'
              : searchQuery || selectedLeague !== 'all' 
                ? 'Try adjusting your search criteria or filters'
                : 'No bets are currently available for acceptance. Check back later or create your own bet!'
            }
          </p>
          
          {(searchQuery || selectedLeague !== 'all') && !error && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedLeague('all');
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
      )}

      {/* Bet Acceptance Modal */}
      {selectedBet && (
        <BetAcceptanceView
          bet={selectedBet}
          onClose={closeBetAcceptance}
          onBetAccepted={handleBetAccepted}
        />
      )}

      {/* Mobile styles are handled in the cyberpunk.css file */}
    </div>
  );
};

export default BetListView;
