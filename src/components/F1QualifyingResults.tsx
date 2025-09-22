import React, { useState, useEffect } from 'react';

interface QualifyingResult {
  position: number;
  driver: string;
  team: string;
  lapTime: string;
  timeDelta: string;
  teamColor: string;
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
  event = 'Azerbaijan' 
}) => {
  const [qualifyingData, setQualifyingData] = useState<QualifyingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchQualifyingResults();
  }, [year, event]);

  const fetchQualifyingResults = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `http://localhost:8000/api/f1/qualifying?year=${year}&event=${encodeURIComponent(event)}`;
      console.log(`🏎️ Fetching qualifying results for ${year} ${event}...`);
      console.log(`🏎️ URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
      
      console.log(`🏎️ Response status: ${response.status} ${response.statusText}`);
      console.log(`🏎️ Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('🏎️ Error response data:', errorData);
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🏎️ Qualifying results received:', data);
      setQualifyingData(data);
    } catch (err: any) {
      console.error('🏎️ Error fetching qualifying results:', err);
      console.error('🏎️ Error type:', typeof err);
      console.error('🏎️ Error message:', err.message);
      console.error('🏎️ Error stack:', err.stack);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
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
      {/* Red Header Bar */}
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
        <span style={{
          color: '#ffffff',
          fontSize: '0.6rem',
          fontWeight: 400,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          QUALIFYING
        </span>
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
      </div>

      {/* Expanded Results */}
      {isExpanded && (
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default F1QualifyingResults;
