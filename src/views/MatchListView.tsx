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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
          margin: '0 auto var(--spacing-lg) auto',
          position: 'relative',
          overflow: 'hidden',
          animation: 'glow 3s ease-in-out infinite'
        }}>
          {/* Gradient Background with Animated Elements */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 25%, #1a0a0a 50%, #2d0a0a 75%, #1a0a0a 100%)',
            backgroundSize: '200% 200%',
            animation: 'gradientShift 8s ease-in-out infinite',
            zIndex: 1
          }} />
          
          {/* Animated Grid Pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(rgba(219, 0, 4, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(219, 0, 4, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            animation: 'gridPulse 4s ease-in-out infinite',
            zIndex: 2
          }} />
          
          {/* Red Header Bar with Enhanced Styling */}
          <div style={{
            background: 'linear-gradient(135deg, #DB0004 0%, #B80003 50%, #DB0004 100%)',
            padding: '12px 16px',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            position: 'relative',
            zIndex: 3,
            boxShadow: '0 2px 8px rgba(219, 0, 4, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Shine Effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
              animation: 'shine 4s ease-in-out infinite',
              zIndex: 1
            }} />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 2
            }}>
              <span style={{
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                fontFamily: 'var(--font-primary)'
              }}>
                Available Matches
              </span>
            </div>
          </div>
          
          {/* Enhanced Content Area */}
          <div style={{
            background: 'linear-gradient(180deg, #0a0a0a 0%, #1a0a0a 100%)',
            border: '1px solid #DB0004',
            borderTop: 'none',
            borderBottomLeftRadius: '6px',
            borderBottomRightRadius: '6px',
            padding: '12px 16px',
            position: 'relative',
            zIndex: 3,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(219, 0, 4, 0.1)'
          }}>
            <div style={{
              textAlign: 'center',
              position: 'relative'
            }}>
              <p style={{ 
                color: '#e0e0e0', 
                fontSize: '0.85rem',
                margin: '0',
                fontWeight: '400',
                lineHeight: '1.3',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                fontFamily: 'var(--font-secondary)',
                textTransform: 'uppercase'
              }}>
                Choose a match and <span style={{ color: '#DB0004', fontWeight: '600' }}>dare</span> to make your prediction
              </p>
            </div>
          </div>
        </div>

        {/* Filters Dropdown Card */}
        <div className="filters-banner-card" style={{
          maxWidth: 'min(90vw, 720px)',
          width: '100%',
          margin: '0 auto var(--spacing-lg) auto'
        }}>
          {/* Red Header Bar - Clickable */}
          <div 
            style={{
              background: '#DB0004',
              padding: '8px 16px',
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background-color 0.2s'
            }}
            onClick={() => setFiltersOpen(!filtersOpen)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#B80003';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#DB0004';
            }}
          >
            <span style={{
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontFamily: 'var(--font-primary)'
            }}>
              FILTERS
            </span>
            <span style={{
              color: '#ffffff',
              fontSize: '0.875rem',
              transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}>
              ▼
            </span>
          </div>
          
          {/* Collapsible Content Area */}
          {filtersOpen && (
            <div style={{
              background: '#000000',
              border: '1px solid #DB0004',
              borderTop: 'none',
              borderBottomLeftRadius: '4px',
              borderBottomRightRadius: '4px',
              padding: '12px 16px',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {/* Search Input */}
              <div className="search-container" style={{ flex: '1', minWidth: '200px' }}>
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
              <div className="league-filter" style={{ minWidth: '120px' }}>
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
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap'
                }}
              >
                {filteredMatches.length} match{filteredMatches.length !== 1 ? 'es' : ''} found
              </div>
            </div>
          )}
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
