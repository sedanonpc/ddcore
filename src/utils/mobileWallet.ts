/**
 * Mobile Wallet Detection and Connection Utilities
 * Handles MetaMask and other wallet detection on mobile devices
 */

export interface WalletInfo {
  name: string;
  icon: string;
  downloadUrl: string;
  isInstalled: boolean;
  isMobile: boolean;
}

export interface MobileWalletDetection {
  isMobile: boolean;
  hasWallet: boolean;
  walletInfo?: WalletInfo;
  connectionMethod: 'metamask' | 'walletconnect' | 'deep-link' | 'none';
}

/**
 * Detect if the user is on a mobile device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Only check user agent for mobile keywords - be very strict
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
  
  // Additional check: ensure it's not a desktop browser with mobile-like user agent
  const isDesktopBrowser = userAgent.includes('chrome') && !userAgent.includes('mobile') && 
                          !userAgent.includes('android') && !userAgent.includes('iphone');
  
  // Only return true if it's genuinely a mobile device user agent
  return isMobileUA && !isDesktopBrowser;
};

/**
 * Detect if the user is using a mobile browser
 */
export const isMobileBrowser = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileBrowsers = [
    'safari', // iOS Safari
    'chrome', // Android Chrome
    'firefox',
    'edge',
    'opera',
    'samsungbrowser'
  ];
  
  return isMobileDevice() && mobileBrowsers.some(browser => userAgent.includes(browser));
};

/**
 * Detect MetaMask on mobile devices
 */
export const detectMobileMetaMask = (): WalletInfo | null => {
  if (typeof window === 'undefined') return null;
  
  const isMobile = isMobileDevice();
  
  // Check for MetaMask in any browser (mobile or desktop)
  const ethereum = (window as any).ethereum;
  if (ethereum && ethereum.isMetaMask) {
    return {
      name: 'MetaMask',
      icon: 'MM',
      downloadUrl: isMobile ? 'https://metamask.io/download/' : 'https://metamask.io/download/',
      isInstalled: true,
      isMobile
    };
  }
  
  // For mobile devices, also check if MetaMask might be available via deep link
  if (isMobile) {
    return {
      name: 'MetaMask',
      icon: 'MM',
      downloadUrl: 'https://metamask.io/download/',
      isInstalled: false,
      isMobile: true
    };
  }
  
  return null;
};

/**
 * Detect wallet connection method for mobile
 */
export const detectMobileWalletConnection = (): MobileWalletDetection => {
  const isMobile = isMobileDevice();
  const walletInfo = detectMobileMetaMask();
  
  if (walletInfo && walletInfo.isInstalled) {
    return {
      isMobile,
      hasWallet: true,
      walletInfo,
      connectionMethod: 'metamask'
    };
  }
  
  if (isMobile) {
    return {
      isMobile,
      hasWallet: false,
      connectionMethod: 'deep-link'
    };
  }
  
  return {
    isMobile: false,
    hasWallet: false,
    connectionMethod: 'none'
  };
};

/**
 * Create MetaMask deep link for mobile
 */
export const createMetaMaskDeepLink = (url?: string): string => {
  const currentUrl = url || window.location.href;
  const encodedUrl = encodeURIComponent(currentUrl);
  
  // MetaMask mobile app deep link
  return `https://metamask.app.link/dapp/${currentUrl}`;
};

/**
 * Create wallet download links based on device
 */
export const getWalletDownloadLinks = (): WalletInfo[] => {
  const isMobile = isMobileDevice();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  const wallets: WalletInfo[] = [
    {
      name: 'MetaMask',
      icon: 'MM',
      downloadUrl: isMobile 
        ? (isIOS ? 'https://apps.apple.com/app/metamask/id1438144202' : 'https://play.google.com/store/apps/details?id=io.metamask')
        : 'https://metamask.io/download/',
      isInstalled: false,
      isMobile
    }
  ];
  
  // Add other popular mobile wallets
  if (isMobile) {
    wallets.push(
      {
        name: 'Trust Wallet',
        icon: 'TW',
        downloadUrl: isIOS 
          ? 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409'
          : 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
        isInstalled: false,
        isMobile: true
      },
      {
        name: 'Coinbase Wallet',
        icon: 'CW',
        downloadUrl: isIOS
          ? 'https://apps.apple.com/app/coinbase-wallet/id1278383455'
          : 'https://play.google.com/store/apps/details?id=org.toshi',
        isInstalled: false,
        isMobile: true
      }
    );
  }
  
  return wallets;
};

/**
 * Handle mobile wallet connection with proper error handling
 */
export const connectMobileWallet = async (): Promise<{
  success: boolean;
  error?: string;
  connectionMethod?: string;
}> => {
  try {
    const detection = detectMobileWalletConnection();
    
    if (!detection.isMobile) {
      // Desktop MetaMask connection
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        await ethereum.request({ method: 'eth_requestAccounts' });
        return { success: true, connectionMethod: 'metamask' };
      }
      return { success: false, error: 'MetaMask not detected' };
    }
    
    // Mobile connection
    if (detection.hasWallet) {
      // MetaMask is installed, try direct connection
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        await ethereum.request({ method: 'eth_requestAccounts' });
        return { success: true, connectionMethod: 'metamask' };
      }
    }
    
    // MetaMask not detected on mobile, use deep link
    const deepLink = createMetaMaskDeepLink();
    window.location.href = deepLink;
    
    return { success: true, connectionMethod: 'deep-link' };
    
  } catch (error: any) {
    console.error('Mobile wallet connection error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to connect wallet' 
    };
  }
};

/**
 * Check if current environment supports wallet connection
 */
export const canConnectWallet = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const detection = detectMobileWalletConnection();
  
  // Desktop with MetaMask
  if (!detection.isMobile && (window as any).ethereum) {
    return true;
  }
  
  // Mobile with MetaMask installed
  if (detection.isMobile && detection.hasWallet) {
    return true;
  }
  
  // Mobile without MetaMask (can use deep link)
  if (detection.isMobile && !detection.hasWallet) {
    return true;
  }
  
  return false;
};

/**
 * Get user-friendly connection instructions
 */
export const getConnectionInstructions = (): {
  title: string;
  steps: string[];
  isMobile: boolean;
} => {
  const isMobile = isMobileDevice();
  const detection = detectMobileWalletConnection();
  
  if (isMobile) {
    if (detection.hasWallet) {
      return {
        title: 'Connect MetaMask',
        steps: [
          '1. Tap "Connect Wallet" below',
          '2. MetaMask will open automatically',
          '3. Approve the connection request',
          '4. Return to this app'
        ],
        isMobile: true
      };
    } else {
      return {
        title: 'Install MetaMask',
        steps: [
          '1. Tap "Download MetaMask" below',
          '2. Install MetaMask from App Store/Play Store',
          '3. Create or import your wallet',
          '4. Return to this app and connect'
        ],
        isMobile: true
      };
    }
  } else {
    return {
      title: 'Connect MetaMask',
      steps: [
        '1. Click "Connect Wallet" below',
        '2. Approve the MetaMask popup',
        '3. Select your account',
        '4. Confirm the connection'
      ],
      isMobile: false
    };
  }
};
