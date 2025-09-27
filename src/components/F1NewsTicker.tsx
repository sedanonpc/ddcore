import React, { useState, useEffect } from 'react';

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

interface F1NewsTickerProps {
  className?: string;
  speed?: number; // pixels per second
  pauseOnHover?: boolean;
}

/**
 * F1NewsTicker Component
 * Displays scrolling F1 news from Autosport RSS feed
 * Follows the same red color scheme and cyberpunk design as other components
 */
const F1NewsTicker: React.FC<F1NewsTickerProps> = ({ 
  className = '', 
  speed = 50,
  pauseOnHover = false
}) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animationDelay, setAnimationDelay] = useState(0);

  useEffect(() => {
    fetchNewsFeed();
  }, []);

  const fetchNewsFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use CORS proxy to fetch RSS feed
      const proxyUrl = 'https://api.allorigins.win/get?url=';
      const rssUrl = 'https://www.autosport.com/rss/f1/news/';
      const url = `${proxyUrl}${encodeURIComponent(rssUrl)}`;
      
      console.log(`📰 Fetching F1 news from Autosport...`);
      console.log(`📰 URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const xmlText = data.contents;
      
      // Parse XML to extract news items
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const items = xmlDoc.querySelectorAll('item');
      
      const news: NewsItem[] = [];
      items.forEach((item, index) => {
        if (index < 10) { // Limit to 10 items for performance
          const title = item.querySelector('title')?.textContent || '';
          const link = item.querySelector('link')?.textContent || '';
          const description = item.querySelector('description')?.textContent || '';
          const pubDate = item.querySelector('pubDate')?.textContent || '';
          
          if (title) {
            news.push({
              title: title.replace(/<[^>]*>/g, ''), // Strip HTML tags
              link,
              description: description.replace(/<[^>]*>/g, '').substring(0, 100) + '...',
              pubDate
            });
          }
        }
      });
      
      console.log(`📰 Successfully fetched ${news.length} news items`);
      setNewsItems(news);
      
      // Generate random animation delay for starting position (0-15 seconds)
      const randomDelay = Math.random() * 15;
      setAnimationDelay(randomDelay);
    } catch (err: any) {
      console.error('📰 Error fetching news feed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (pubDate: string) => {
    try {
      const date = new Date(pubDate);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours}h ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className={`f1-news-ticker ${className}`} style={{
        maxWidth: 'min(90vw, 720px)',
        width: '100%',
        margin: '0 auto',
        position: 'relative',
      }}>
        {/* Red Header Bar */}
        <div className="ticker-header" style={{
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
            F1 NEWS
          </span>
        </div>

        {/* Black Content Area */}
        <div className="ticker-content" style={{
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
              Loading F1 news...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`f1-news-ticker ${className}`} style={{
        maxWidth: 'min(90vw, 720px)',
        width: '100%',
        margin: '0 auto',
        position: 'relative',
      }}>
        {/* Red Header Bar */}
        <div className="ticker-header" style={{
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
            F1 NEWS
          </span>
        </div>

        {/* Black Content Area with Error */}
        <div className="ticker-content" style={{
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
            onClick={fetchNewsFeed}
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

  if (newsItems.length === 0) return null;

  return (
    <div className={`f1-news-ticker ${className}`} style={{
      maxWidth: 'min(90vw, 720px)',
      width: '100%',
      margin: '0 auto',
      position: 'relative'
    }}>
      {/* Clean Header Bar */}
      <div className="ticker-header" style={{
        padding: '4px 12px',
        height: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{
          color: '#DB0004',
          fontSize: '0.6rem',
          fontWeight: 400,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          F1 NEWS
        </span>
        <span style={{
          color: '#DB0004',
          fontSize: '0.5rem',
          fontWeight: 400,
          opacity: 0.8
        }}>
          AUTOSPORT
        </span>
      </div>

      {/* Black Content Area with Scrolling Text */}
      <div 
        className="ticker-content" 
        style={{
          background: '#000000',
          border: '1px solid #DB0004',
          borderBottomLeftRadius: '4px',
          borderBottomRightRadius: '4px',
          padding: '8px 0px',
          height: '40px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            whiteSpace: 'nowrap',
            animation: 'f1-news-scroll 15s linear infinite',
            animationDelay: `${animationDelay}s`
          }}
        >
          {/* Triple the items for seamless infinite loop */}
          {[...newsItems, ...newsItems, ...newsItems].map((item, index) => (
            <a
              key={`item-${index}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                marginRight: '60px',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#DB0004';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#ffffff';
              }}
            >
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#DB0004',
                marginRight: '8px',
                flexShrink: 0
              }}></div>
              <span style={{ marginRight: '12px' }}>
                {item.title}
              </span>
              <span style={{
                color: '#ffffff',
                opacity: 0.6,
                fontSize: '0.6rem',
                marginLeft: '8px'
              }}>
                {formatTimeAgo(item.pubDate)}
              </span>
            </a>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes f1-news-scroll {
            0% {
              transform: translateX(0%);
            }
            100% {
              transform: translateX(-100%);
            }
          }
        `
      }} />
    </div>
  );
};

export default F1NewsTicker;
