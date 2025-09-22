import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchDataService } from '../utils/matchData';
import { blockchainService } from '../services/blockchain';
import { Match, League, Competitor } from '../types';
import MatchListItemView from '../components/MatchListItemView';
import BetCreationView from '../components/BetCreationView';
import { Squares } from '../components/Squares';
import { ReactComponent as HellracerBanner } from '../assets/images/hellracer banner 2.svg';
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
            borderTopRightRadius: '4px'
          }}>
            <span style={{
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              AVAILABLE MATCHES
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
              Choose a match and dare to make your prediction
            </p>
          </div>
        </div>

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
        </div>

        {/* Match List */}
        {filteredMatches.length > 0 ? (
          <div 
            className="match-grid"
            style={{
              display: 'flex',
              flexDirection: 'column',
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
          <div className="no-matches-banner-card" style={{
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
                NO MATCHES FOUND
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
      </div>
    </div>
  );
};

export default MatchListView;
