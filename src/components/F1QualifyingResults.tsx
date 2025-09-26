import React, { useState, useEffect, useCallback } from 'react';

interface QualifyingResult {
  position: number;
  driver: string;
  team: string;
  lapTime: string;
  timeDelta: string;
  teamColor: string;
  sectorTimes?: string[];
  topSpeed?: number;
  form?: {
    last3Races: number[];
    averagePosition: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface BettingInsight {
  type: 'favorite' | 'underdog' | 'track_specialist' | 'weather_specialist' | 'form_based' | 'value_bet';
  driver: string;
  reason: string;
  confidence: number;
  odds?: number;
}

interface QualifyingData {
  event: string;
  session: string;
  results: QualifyingResult[];
  polePosition: {
    driver: string;
    time: string;
  };
  totalDrivers: number;
  raceInfo?: {
    name: string;
    location: string;
    date: string;
    weather?: string;
    trackTemperature?: number;
    airTemperature?: number;
  };
  bettingInsights?: {
    favorites: BettingInsight[];
    underdogs: BettingInsight[];
    trackSpecialists: BettingInsight[];
    weatherSpecialists: BettingInsight[];
    formBased: BettingInsight[];
    valueBets: BettingInsight[];
  };
  cacheInfo?: {
    fromCache: boolean;
    cacheAge: number;
    cachedAt: string;
  };
}

interface F1QualifyingResultsProps {
  className?: string;
  year?: number;
  event?: string;
}

/**
 * F1QualifyingResults Component
 * Displays qualifying results in the same style as FeaturedMatchCard
 * Follows the red color scheme and cyberpunk design
 */
const F1QualifyingResults: React.FC<F1QualifyingResultsProps> = ({ 
  className = '', 
  year = 2025, 
  event = 'Australia' 
}) => {
  const [qualifyingData, setQualifyingData] = useState<QualifyingData | null>(null);
  const [bettingInsights, setBettingInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'qualifying' | 'insights'>('qualifying');

  useEffect(() => {
    fetchQualifyingResults();
    fetchBettingInsights();
  }, [year, event, fetchQualifyingResults, fetchBettingInsights]);

  const fetchQualifyingResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use Sportradar API with caching
      const isDevelopment = process.env.NODE_ENV === 'development';
      const baseUrl = isDevelopment ? 'http://localhost:3001' : '';
      const url = `${baseUrl}/api/f1/sportradar-qualifying?year=${year}&event=${encodeURIComponent(event)}`;
      console.log(`🏎️ Fetching Sportradar qualifying results for ${year} ${event}...`);
      console.log(`🏎️ URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`🏎️ Response status: ${response.status} ${response.statusText}`);
      console.log(`🏎️ Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('🏎️ Error response data:', errorData);
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🏎️ Sportradar qualifying results received:', data);
      setQualifyingData(data);
    } catch (err: any) {
      console.error('🏎️ Error fetching Sportradar qualifying results:', err);
      console.error('🏎️ Error type:', typeof err);
      console.error('🏎️ Error message:', err.message);
      console.error('🏎️ Error stack:', err.stack);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [year, event]);

  const fetchBettingInsights = useCallback(async () => {
    try {
      const isDevelopment = process.env.NODE_ENV === 'development';
      const baseUrl = isDevelopment ? 'http://localhost:3001' : '';
      const url = `${baseUrl}/api/f1/sportradar-insights?year=${year}&event=${encodeURIComponent(event)}`;
      console.log(`🎯 Fetching Sportradar betting insights for ${year} ${event}...`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎯 Betting insights received:', data);
        setBettingInsights(data);
      }
    } catch (err: any) {
      console.error('🎯 Error fetching betting insights:', err);
      // Don't set error state for insights - it's optional
    }
  }, [year, event]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getFormTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  const getFormTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '#00ff00';
      case 'down': return '#ff4444';
      case 'stable': return '#ffffff';
      default: return '#ffffff';
    }
  };

  if (loading) {
    return (
      <div className={`qualifying-results-card ${className}`} style={{
        maxWidth: 'min(90vw, 720px)',
        width: '100%',
        margin: '0 auto',
        position: 'relative',
      }}>
        {/* Red Header Bar */}
        <div className="qualifying-header" style={{
          background: '#DB0004',
          padding: '4px 12px',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          height: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        }}>
          <span style={{
            color: '#ffffff',
            fontSize: '0.6rem',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            QUALIFYING
          </span>
        </div>

        {/* Black Content Area */}
        <div className="qualifying-content" style={{
          background: '#000000',
          border: '1px solid #DB0004',
          borderTop: 'none',
          borderBottomLeftRadius: '4px',
          borderBottomRightRadius: '4px',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '40px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#DB0004',
              animation: 'pulse 2s infinite'
            }}></div>
            <span style={{
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>
              Loading qualifying results...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`qualifying-results-card ${className}`} style={{
        maxWidth: 'min(90vw, 720px)',
        width: '100%',
        margin: '0 auto',
        position: 'relative',
      }}>
        {/* Red Header Bar */}
        <div className="qualifying-header" style={{
          background: '#DB0004',
          padding: '4px 12px',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          height: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        }}>
          <span style={{
            color: '#ffffff',
            fontSize: '0.6rem',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            QUALIFYING
          </span>
        </div>

        {/* Black Content Area with Error */}
        <div className="qualifying-content" style={{
          background: '#000000',
          border: '1px solid #DB0004',
          borderTop: 'none',
          borderBottomLeftRadius: '4px',
          borderBottomRightRadius: '4px',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '40px'
        }}>
          <span style={{
            color: '#ffffff',
            fontSize: '0.6rem',
            fontWeight: 400,
            opacity: 0.7
          }}>
            ⚠️ {error}
          </span>
          <button
            onClick={fetchQualifyingResults}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.6rem',
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '2px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(219, 0, 4, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  if (!qualifyingData) return null;

  const displayResults = isExpanded ? qualifyingData.results : qualifyingData.results.slice(0, 3);

  return (
    <div className={`qualifying-results-card ${className}`} style={{
      maxWidth: 'min(90vw, 720px)',
      width: '100%',
      margin: '0 auto',
      position: 'relative'
    }}>
      {/* Red Header Bar with Tabs */}
      <div className="qualifying-header" style={{
        background: '#DB0004',
        padding: '4px 12px',
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px',
        height: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setActiveTab('qualifying')}
            style={{
              background: activeTab === 'qualifying' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.6rem',
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '2px',
              transition: 'background-color 0.2s'
            }}
          >
            QUALIFYING
          </button>
          {bettingInsights && (
            <button
              onClick={() => setActiveTab('insights')}
              style={{
                background: activeTab === 'insights' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.6rem',
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '2px',
                transition: 'background-color 0.2s'
              }}
            >
              INSIGHTS
            </button>
          )}
        </div>
        <span style={{
          color: '#ffffff',
          fontSize: '0.5rem',
          fontWeight: 400,
          opacity: 0.8
        }}>
          {qualifyingData.event}
        </span>
      </div>

      {/* Black Content Area */}
      <div className="qualifying-content" style={{
        background: '#000000',
        border: '1px solid #DB0004',
        borderTop: 'none',
        borderBottomLeftRadius: isExpanded ? '0px' : '4px',
        borderBottomRightRadius: isExpanded ? '0px' : '4px',
        padding: '4px 0px',
        position: 'relative'
      }}>
        {activeTab === 'qualifying' ? (
          <>
            {/* Pole Position Summary */}
            <div style={{
              padding: '4px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: isExpanded ? '1px solid rgba(219, 0, 4, 0.2)' : 'none'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#DB0004',
                  animation: 'pulse 2s infinite'
                }}></div>
                <span style={{
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px'
                }}>
                  POLE: {qualifyingData.polePosition.driver}
                </span>
                <span style={{
                  color: '#ffffff',
                  fontSize: '0.6rem',
                  opacity: 0.7
                }}>
                  {qualifyingData.polePosition.time}
                </span>
                {qualifyingData.cacheInfo && (
                  <span style={{
                    color: '#ffffff',
                    fontSize: '0.5rem',
                    opacity: 0.5,
                    marginLeft: '8px'
                  }}>
                    {qualifyingData.cacheInfo.fromCache ? '📦' : '🔄'}
                  </span>
                )}
              </div>

              {/* Expand/Collapse Button */}
              {qualifyingData.results.length > 3 && (
                <button
                  onClick={toggleExpanded}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.6rem',
                    fontWeight: 400,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(219, 0, 4, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {isExpanded ? 'COLLAPSE' : 'VIEW ALL'}
                </button>
              )}
            </div>
          </>
        ) : (
          /* Betting Insights Tab */
          <div style={{
            padding: '8px 12px',
            minHeight: '60px'
          }}>
            {bettingInsights ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {/* Race Info */}
                {bettingInsights.raceInfo && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 0',
                    borderBottom: '1px solid rgba(219, 0, 4, 0.2)'
                  }}>
                    <span style={{
                      color: '#ffffff',
                      fontSize: '0.6rem',
                      fontWeight: 400
                    }}>
                      🏁 {bettingInsights.raceInfo.name}
                    </span>
                    <span style={{
                      color: '#ffffff',
                      fontSize: '0.5rem',
                      opacity: 0.7
                    }}>
                      {bettingInsights.raceInfo.location}
                    </span>
                  </div>
                )}

                {/* Betting Recommendations */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  justifyContent: 'space-between'
                }}>
                  {bettingInsights.bettingRecommendations?.favorites?.slice(0, 2).map((fav: any, index: number) => (
                    <div key={index} style={{
                      background: 'rgba(219, 0, 4, 0.1)',
                      border: '1px solid rgba(219, 0, 4, 0.3)',
                      borderRadius: '2px',
                      padding: '2px 6px',
                      flex: '1',
                      minWidth: '120px'
                    }}>
                      <span style={{
                        color: '#ffffff',
                        fontSize: '0.5rem',
                        fontWeight: 400
                      }}>
                        ⭐ {fav.driver}
                      </span>
                    </div>
                  ))}
                  {bettingInsights.bettingRecommendations?.underdogs?.slice(0, 2).map((dog: any, index: number) => (
                    <div key={index} style={{
                      background: 'rgba(0, 255, 0, 0.1)',
                      border: '1px solid rgba(0, 255, 0, 0.3)',
                      borderRadius: '2px',
                      padding: '2px 6px',
                      flex: '1',
                      minWidth: '120px'
                    }}>
                      <span style={{
                        color: '#ffffff',
                        fontSize: '0.5rem',
                        fontWeight: 400
                      }}>
                        🎯 {dog.driver}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Confidence Level */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{
                    color: '#ffffff',
                    fontSize: '0.5rem',
                    opacity: 0.7
                  }}>
                    Confidence: {bettingInsights.confidence || 0}%
                  </span>
                  {bettingInsights.cacheInfo && (
                    <span style={{
                      color: '#ffffff',
                      fontSize: '0.5rem',
                      opacity: 0.5
                    }}>
                      {bettingInsights.cacheInfo.fromCache ? '📦' : '🔄'}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '40px'
              }}>
                <span style={{
                  color: '#ffffff',
                  fontSize: '0.6rem',
                  opacity: 0.7
                }}>
                  Loading betting insights...
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded Results */}
      {isExpanded && activeTab === 'qualifying' && (
        <div className="qualifying-expanded" style={{
          background: '#000000',
          border: '1px solid #DB0004',
          borderTop: 'none',
          borderBottomLeftRadius: '4px',
          borderBottomRightRadius: '4px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {displayResults.map((result, index) => (
            <div
              key={result.position}
              style={{
                padding: '4px 12px',
                borderBottom: index < displayResults.length - 1 ? '1px solid rgba(219, 0, 4, 0.1)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(219, 0, 4, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  color: '#ffffff',
                  fontSize: '0.6rem',
                  fontWeight: 400,
                  minWidth: '16px'
                }}>
                  P{result.position}
                </span>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    background: result.teamColor,
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                ></div>
                <span style={{
                  color: '#ffffff',
                  fontSize: '0.6rem',
                  fontWeight: 400,
                  textTransform: 'uppercase'
                }}>
                  {result.driver}
                </span>
                {/* Form indicator */}
                {result.form && (
                  <span style={{
                    color: getFormTrendColor(result.form.trend),
                    fontSize: '0.5rem',
                    marginLeft: '4px'
                  }}>
                    {getFormTrendIcon(result.form.trend)}
                  </span>
                )}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  color: '#ffffff',
                  fontSize: '0.6rem',
                  opacity: 0.7
                }}>
                  {result.lapTime}
                </span>
                <span style={{
                  color: result.timeDelta === 'Pole' ? '#DB0004' : '#ffffff',
                  fontSize: '0.5rem',
                  opacity: 0.8,
                  minWidth: '40px',
                  textAlign: 'right'
                }}>
                  {result.timeDelta}
                </span>
                {/* Top speed indicator */}
                {result.topSpeed && (
                  <span style={{
                    color: '#ffffff',
                    fontSize: '0.5rem',
                    opacity: 0.6,
                    marginLeft: '4px'
                  }}>
                    {result.topSpeed}km/h
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default F1QualifyingResults;
