/**
 * Utility functions for generating placeholder images
 */

/**
 * Generate a data URI for a placeholder image
 * @param width - Image width
 * @param height - Image height
 * @param bgColor - Background color (hex without #)
 * @param textColor - Text color (hex without #)
 * @param text - Text to display
 * @returns Data URI string
 */
export function generatePlaceholderDataURI(
  width: number,
  height: number,
  bgColor: string,
  textColor: string,
  text: string
): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#${bgColor}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.3}" 
            fill="#${textColor}" text-anchor="middle" dominant-baseline="middle">
        ${text}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Get placeholder image for leagues
 */
export function getLeaguePlaceholder(leagueId: string): string {
  const placeholders: Record<string, { bg: string; text: string; textColor: string }> = {
    nba: { bg: '1a1a2e', text: 'NBA', textColor: '16213e' },
    f1: { bg: 'e94560', text: 'F1', textColor: '0f3460' },
    fifa: { bg: '16537e', text: 'FIFA', textColor: '533483' },
    wwe: { bg: 'd4af37', text: 'WWE', textColor: '1a1a2e' }
  };
  
  const config = placeholders[leagueId] || { bg: '666666', text: leagueId.toUpperCase(), textColor: 'ffffff' };
  return generatePlaceholderDataURI(100, 100, config.bg, config.textColor, config.text);
}

/**
 * Get placeholder image for competitors
 */
export function getCompetitorPlaceholder(competitorId: string, abbreviation: string): string {
  const placeholders: Record<string, { bg: string; textColor: string }> = {
    // NBA
    okc: { bg: '007ac1', textColor: 'ffffff' },
    ind: { bg: '002d62', textColor: 'fdbb30' },
    
    // F1
    verstappen: { bg: '0600ef', textColor: 'ffffff' },
    hamilton: { bg: '00d2be', textColor: 'ffffff' },
    leclerc: { bg: 'dc143c', textColor: 'ffffff' },
    norris: { bg: 'ff8700', textColor: 'ffffff' },
    russell: { bg: '00d2be', textColor: 'ffffff' },
    
    // FIFA
    argentina: { bg: '74acdf', textColor: 'ffffff' },
    brazil: { bg: '009739', textColor: 'ffdf00' },
    france: { bg: '0055a4', textColor: 'ffffff' },
    spain: { bg: 'aa151b', textColor: 'ffdf00' },
    
    // WWE
    reigns: { bg: '1a1a2e', textColor: 'd4af37' },
    rollins: { bg: '1a1a2e', textColor: 'e94560' },
    mcintyre: { bg: '1a1a2e', textColor: '16537e' },
    cena: { bg: '1a1a2e', textColor: '00d2be' },
    lesnar: { bg: '1a1a2e', textColor: 'ff8700' },
    orton: { bg: '1a1a2e', textColor: '533483' }
  };
  
  const config = placeholders[competitorId] || { bg: '666666', textColor: 'ffffff' };
  return generatePlaceholderDataURI(80, 80, config.bg, config.textColor, abbreviation);
}
