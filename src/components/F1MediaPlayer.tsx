import React, { useState, useEffect } from 'react';

interface F1MediaPlayerProps {
  className?: string;
  videoId?: string;
  playlistId?: string;
}

const F1MediaPlayer: React.FC<F1MediaPlayerProps> = ({
  className = '',
  videoId = 'in03rYd74NU', // Default to the provided video
  playlistId
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Simulate loading delay for better UX
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleIframeError = () => {
    setHasError(true);
    setErrorMessage('Video unavailable - F1 content may be restricted');
    setShowFallback(true);
  };

  const handleIframeLoad = () => {
    setHasError(false);
    setErrorMessage('');
    setShowFallback(false);
  };


  const getEmbedUrl = () => {
    if (playlistId) {
      return `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=0&rel=0&modestbranding=1`;
    }
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`;
  };

  const fallbackOptions = [
    {
      title: 'Watch on YouTube',
      description: 'Open in new tab',
      action: () => window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank'),
      icon: '▶️'
    },
    {
      title: 'F1 Official Highlights',
      description: 'Latest race highlights',
      action: () => window.open('https://www.youtube.com/c/Formula1', '_blank'),
      icon: '🏁'
    },
    {
      title: 'F1 Live Timing',
      description: 'Real-time race data',
      action: () => window.open('https://www.fia.com/events/fia-formula-one-world-championship/season-2024', '_blank'),
      icon: '📊'
    }
  ];

  if (!isLoaded) {
    return (
      <div className={`media-player-card ${className}`} style={{
        maxWidth: 'min(90vw, 720px)',
        width: '100%',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
        pointerEvents: 'auto'
      }}>
        {/* Red Header Bar */}
        <div className="media-header" style={{
          background: '#DB0004',
          color: 'white',
          padding: '3px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          fontWeight: 'bold',
          fontSize: '14px',
          textTransform: 'uppercase'
        }}>
          <span>F1 MEDIA</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px' }}>LOADING...</span>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        </div>

        {/* Black Content Area */}
        <div className="media-content" style={{
          background: '#000000',
          border: '1px solid #DB0004',
          borderTop: 'none',
          borderBottomLeftRadius: '4px',
          borderBottomRightRadius: '4px',
          padding: '20px',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>
            Loading F1 content...
          </div>
        </div>
      </div>
    );
  }

  if (hasError || showFallback) {
    return (
      <div className={`media-player-card ${className}`} style={{
        maxWidth: 'min(90vw, 720px)',
        width: '100%',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
        pointerEvents: 'auto'
      }}>
        {/* Red Header Bar */}
        <div className="media-header" style={{
          background: '#DB0004',
          color: 'white',
          padding: '3px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          fontWeight: 'bold',
          fontSize: '14px',
          textTransform: 'uppercase'
        }}>
          <span>F1 MEDIA</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px' }}>⚠️ RESTRICTED</span>
            <button
              onClick={() => setShowFallback(!showFallback)}
              style={{
                background: 'none',
                border: '1px solid white',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '2px',
                fontSize: '10px',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {showFallback ? 'HIDE' : 'OPTIONS'}
            </button>
          </div>
        </div>

        {/* Black Content Area */}
        <div className="media-content" style={{
          background: '#000000',
          border: '1px solid #DB0004',
          borderTop: 'none',
          borderBottomLeftRadius: '4px',
          borderBottomRightRadius: '4px',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>🚫</div>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
              {errorMessage || 'F1 content is restricted'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              Try these alternatives:
            </div>
          </div>

          {/* Fallback Options */}
          {showFallback && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {fallbackOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={option.action}
                  style={{
                    background: 'none',
                    border: '1px solid #DB0004',
                    color: 'white',
                    padding: '3px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(219, 0, 4, 0.1)';
                    e.currentTarget.style.borderColor = '#ff4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.borderColor = '#DB0004';
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{option.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold' }}>{option.title}</div>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>{option.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`media-player-card ${className}`} style={{
      maxWidth: 'min(90vw, 720px)',
      width: '100%',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
      pointerEvents: 'auto'
    }}>
      {/* Red Header Bar */}
      <div className="media-header" style={{
        background: '#DB0004',
        color: 'white',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px',
        fontWeight: 'bold',
        fontSize: '14px',
        textTransform: 'uppercase'
      }}>
        <span>F1 MEDIA</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px' }}>†</span>
        </div>
      </div>

      {/* Black Content Area */}
      <div className="media-content" style={{
        background: '#000000',
        border: '1px solid #DB0004',
        borderTop: 'none',
        borderBottomLeftRadius: '4px',
        borderBottomRightRadius: '4px',
        padding: '0',
        position: 'relative'
      }}>
        {/* YouTube Embed */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '200px'
        }}>
          <iframe
            src={getEmbedUrl()}
            title="F1 Media Player"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '0 0 4px 4px'
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onError={handleIframeError}
            onLoad={handleIframeLoad}
          />
          
          {/* Overlay for better error detection */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'transparent',
              pointerEvents: 'none',
              zIndex: 1
            }}
            onError={handleIframeError}
          />
        </div>

      </div>
    </div>
  );
};

export default F1MediaPlayer;
