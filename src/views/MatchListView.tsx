import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchDataService } from '../utils/matchData';
import { blockchainService } from '../services/blockchain';
import { Match, League, Competitor } from '../types';
import MatchListItemView from '../components/MatchListItemView';
import BetCreationView from '../components/BetCreationView';
import '../styles/cyberpunk.css';

/**
 * MatchListView Component
 * Displays list of available matches for betting
 * Shows matches from NBA, F1, FIFA, and WWE
 */
const MatchListView: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

    loadMatches();
  }, [navigate]);

  /**
   * Load all matches from the data service
   */
  const loadMatches = () => {
    try {
      const allMatches = matchDataService.getAllMatches();
      setMatches(allMatches);
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Filter matches based on search query and league selection
   */
  const filteredMatches = matches.filter(match => {
    // Filter by league
    if (selectedLeague !== 'all' && match.leagueID !== selectedLeague) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = match.title.toLowerCase().includes(query);
      const matchesSubtitle = match.subtitle.toLowerCase().includes(query);
      
      // Also search in competitor names
      const competitors = matchDataService.getMatchCompetitors(match.id);
      const matchesCompetitors = Object.values(competitors).some(competitor =>
        competitor.name.toLowerCase().includes(query) ||
        competitor.abbreviation.toLowerCase().includes(query)
      );

      return matchesTitle || matchesSubtitle || matchesCompetitors;
    }

    return true;
  });

  /**
   * Handle match selection for bet creation
   */
  const handleMatchSelect = (match: Match) => {
    setSelectedMatch(match);
  };

  /**
   * Close bet creation modal
   */
  const closeBetCreation = () => {
    setSelectedMatch(null);
  };

  /**
   * Handle successful bet creation
   */
  const handleBetCreated = () => {
    setSelectedMatch(null);
    // Could add success notification here
  };

  /**
   * Get unique leagues for filter dropdown
   */
  const getAvailableLeagues = () => {
    const leagueIds = matches.map(match => match.leagueID);
    const uniqueLeagueIds = leagueIds.filter((id, index) => leagueIds.indexOf(id) === index);
    return uniqueLeagueIds.map(leagueId => matchDataService.getLeague(leagueId)).filter(Boolean) as League[];
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner-large" />
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>
          Loading Matches
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Fetching the latest sports events...
        </p>
      </div>
    );
  }

  return (
    <div 
      className="match-list-container"
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'var(--spacing-xl) var(--spacing-lg)'
      }}
    >
      {/* Header */}
      <div className="match-list-header mb-lg">
        <h1 className="text-glow">Available Matches</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
          Choose a match and dare to make your prediction
        </p>
      </div>

      {/* Filters */}
      <div 
        className="match-filters mb-lg"
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
            placeholder="Search matches, teams, or competitors..."
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
          {filteredMatches.length} match{filteredMatches.length !== 1 ? 'es' : ''} found
        </div>
      </div>

      {/* Match List */}
      {filteredMatches.length > 0 ? (
        <div 
          className="match-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: 'var(--spacing-lg)'
          }}
        >
          {filteredMatches.map(match => (
            <MatchListItemView
              key={match.id}
              match={match}
              onSelect={() => handleMatchSelect(match)}
            />
          ))}
        </div>
      ) : (
        <div 
          className="no-matches"
          style={{
            textAlign: 'center',
            padding: 'var(--spacing-2xl)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-primary)'
          }}
        >
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
            No matches found
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>
            {searchQuery || selectedLeague !== 'all' 
              ? 'Try adjusting your search criteria or filters'
              : 'No matches are currently available for betting'
            }
          </p>
          {(searchQuery || selectedLeague !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedLeague('all');
              }}
              className="btn btn-secondary mt-md"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Bet Creation Modal */}
      {selectedMatch && (
        <BetCreationView
          match={selectedMatch}
          onClose={closeBetCreation}
          onBetCreated={handleBetCreated}
        />
      )}

      {/* Mobile styles are handled in the cyberpunk.css file */}
    </div>
  );
};

export default MatchListView;
