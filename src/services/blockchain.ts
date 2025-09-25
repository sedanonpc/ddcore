import { ethers } from 'ethers';
import { EthereumProvider, User } from '../types';

// Import deployment info as fallback
import deploymentInfo from '../deployment-info.json';

// Core Testnet2 network configuration
export const CORE_NETWORK = {
  chainId: '0x45A', // 1114 in hex
  chainName: 'Core Blockchain TestNet2',
  nativeCurrency: {
    name: 'tCORE2',
    symbol: 'tCORE2',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.test2.btcs.network'],
  blockExplorerUrls: ['https://scan.test2.btcs.network'],
};

/**
 * Service class for handling blockchain interactions
 * Manages wallet connections, contract interactions, and network switching
 */
export class BlockchainService {
  private provider: ethers.providers.Web3Provider | null = null
  private signer: ethers.Signer | null = null;
  private bettingContract: ethers.Contract | null = null;
  private nftContract: ethers.Contract | null = null;

  // Contract ABIs (simplified for key functions)
  private readonly BETTING_ABI = [
    'function createBet(string memory matchId, string memory creatorSelection, string memory metadataURI) external payable returns (uint256)',
    'function acceptBet(uint256 betId, string memory acceptorSelection, string memory newMetadataURI) external payable',
    'function resolveBet(uint256 betId, string memory winningSelection, string memory finalMetadataURI) external',
    'function getBet(uint256 betId) external view returns (tuple(uint256 id, string matchId, address creator, address acceptor, uint256 amount, uint8 status, string creatorSelection, string acceptorSelection, string winner, uint256 nftTokenId, uint256 createdAt, uint256 resolvedAt))',
    'function getUserBets(address user) external view returns (uint256[])',
    'function getMatchBets(string memory matchId) external view returns (uint256[])',
    'function getCurrentBetId() external view returns (uint256)',
    'event BetCreated(uint256 indexed betId, string indexed matchId, address indexed creator, uint256 amount, string creatorSelection, uint256 nftTokenId)',
    'event BetAccepted(uint256 indexed betId, address indexed acceptor, string acceptorSelection)',
    'event BetResolved(uint256 indexed betId, string winner, address winnerAddress, uint256 payout)'
  ];

  private readonly NFT_ABI = [
    'function mintNFT(address to, string memory tokenURI) external returns (uint256)',
    'function tokenURI(uint256 tokenId) external view returns (string)',
    'function ownerOf(uint256 tokenId) external view returns (address)',
    'function balanceOf(address owner) external view returns (uint256)',
    'function transferFrom(address from, address to, uint256 tokenId) external'
  ];

  /**
   * Check if MetaMask is installed
   */
  public isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && !!(window as any).ethereum;
  }

  /**
   * Connect wallet and initialize contracts
   */
  public async connectWallet(): Promise<User> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('MetaMask not detected. Please install MetaMask.');
    }

    const ethereum = (window as any).ethereum as EthereumProvider;

    try {
      // Request account access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please check your MetaMask connection.');
      }

      // Initialize provider
      this.provider = new ethers.providers.Web3Provider(ethereum);
      this.signer = this.provider.getSigner();

      // Get network info and switch if needed
      const network = await this.provider.getNetwork();
      if (network.chainId !== 1114) { // Core Testnet2 chain ID
        await this.switchToCore();
      }

      // Initialize contracts
      this.initializeContracts();

      // Create user object
      const address = await this.signer.getAddress();
      const user: User = {
        walletAddress: address,
        username: `user_${address.slice(-6)}` // Generate a simple username
      };

      // Save user to localStorage
      localStorage.setItem('user', JSON.stringify(user));

      console.log('Wallet connected successfully:', user);
      return user;

    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  }

  /**
   * Switch to Core Testnet2
   */
  private async switchToCore(): Promise<void> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('MetaMask not detected');
    }

    const ethereum = (window as any).ethereum as EthereumProvider;

    try {
      // Try to switch to Core network
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CORE_NETWORK.chainId }],
      });
    } catch (error: any) {
      // Network doesn't exist, add it
      if (error.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [CORE_NETWORK],
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Initialize smart contracts
   */
  private initializeContracts(): void {
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }

    // Try environment variables first, then fall back to deployment info
    let bettingAddress = process.env.REACT_APP_BETTING_CONTRACT_ADDRESS;
    let nftAddress = process.env.REACT_APP_NFT_CONTRACT_ADDRESS;

    if (!bettingAddress || !nftAddress) {
      console.log('Environment variables not found, using deployment info fallback');
      bettingAddress = deploymentInfo.contracts.SportsBetting;
      nftAddress = deploymentInfo.contracts.SportsBettingNFT;
    }

    if (!bettingAddress || !nftAddress) {
      console.error('Contract addresses not found in environment variables or deployment info');
      return;
    }

    this.bettingContract = new ethers.Contract(bettingAddress, this.BETTING_ABI, this.signer);
    this.nftContract = new ethers.Contract(nftAddress, this.NFT_ABI, this.signer);

    console.log('Contracts initialized successfully');
    console.log('Betting contract address:', bettingAddress);
    console.log('NFT contract address:', nftAddress);
  }

  /**
   * Get current user from localStorage
   */
  public getCurrentUser(): User | null {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Restore blockchain connection from localStorage user
   */
  public async restoreConnection(): Promise<boolean> {
    const user = this.getCurrentUser();
    if (!user) {
      console.log('🔍 No user in localStorage to restore');
      return false;
    }

    if (this.isInitialized()) {
      console.log('🔍 Blockchain already initialized');
      return true;
    }

    if (!this.isMetaMaskInstalled()) {
      console.log('🔍 MetaMask not installed');
      return false;
    }

    try {
      console.log('🔍 Attempting to restore blockchain connection...');
      const ethereum = (window as any).ethereum as EthereumProvider;

      // Check if the account is still connected
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        console.log('🔍 No accounts connected in MetaMask');
        return false;
      }

      // Check if the stored user's address matches the connected account
      const connectedAddress = accounts[0].toLowerCase();
      const storedAddress = user.walletAddress.toLowerCase();
      if (connectedAddress !== storedAddress) {
        console.log('🔍 Account mismatch:', { connectedAddress, storedAddress });
        return false;
      }

      // Initialize provider and signer
      this.provider = new ethers.providers.Web3Provider(ethereum);
      this.signer = this.provider.getSigner();

      // Check network
      const network = await this.provider.getNetwork();
      if (network.chainId !== 1114) {
        console.log('🔍 Wrong network, need to switch to Core Testnet2');
        return false;
      }

      // Initialize contracts
      this.initializeContracts();

      console.log('✅ Blockchain connection restored successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to restore blockchain connection:', error);
      return false;
    }
  }

  /**
   * Disconnect wallet and clear user data
   */
  public disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.bettingContract = null;
    this.nftContract = null;
    localStorage.removeItem('user');
  }

  /**
   * Create a new bet on the blockchain
   */
  public async createBet(
    matchId: string,
    creatorSelection: string,
    amount: string,
    metadataURI: string
  ): Promise<{ betId: number; nftTokenId: number; transactionHash: string }> {
    if (!this.bettingContract) {
      throw new Error('Betting contract not initialized. Please connect your wallet first.');
    }

    try {
      console.log('🚀 Creating bet on blockchain...', {
        matchId,
        creatorSelection,
        amount,
        metadataURI
      });

      const amountWei = ethers.utils.parseEther(amount);
      
      console.log('💰 Amount in Wei:', amountWei.toString());
      console.log('🔗 Calling createBet function...');

      const tx = await this.bettingContract.createBet(
        matchId,
        creatorSelection,
        metadataURI,
        { value: amountWei }
      );

      console.log('📝 Transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();
      
      console.log('✅ Transaction confirmed!', receipt);
      
      // Parse the BetCreated event to get bet ID and NFT token ID
      const betCreatedEvent = receipt.events?.find((e: any) => e.event === 'BetCreated');
      if (!betCreatedEvent || !betCreatedEvent.args) {
        throw new Error('BetCreated event not found in transaction receipt');
      }

      // Handle both ethers v5 and v6 event parsing
      const betId = betCreatedEvent.args.betId ? 
        (typeof betCreatedEvent.args.betId.toNumber === 'function' ? 
          betCreatedEvent.args.betId.toNumber() : 
          Number(betCreatedEvent.args.betId)) : 
        betCreatedEvent.args[0] ? Number(betCreatedEvent.args[0]) : 0;
        
      const nftTokenId = betCreatedEvent.args.nftTokenId ? 
        (typeof betCreatedEvent.args.nftTokenId.toNumber === 'function' ? 
          betCreatedEvent.args.nftTokenId.toNumber() : 
          Number(betCreatedEvent.args.nftTokenId)) : 
        betCreatedEvent.args[5] ? Number(betCreatedEvent.args[5]) : 0;

      console.log('🎉 Bet created successfully!', {
        betId,
        nftTokenId,
        transactionHash: tx.hash
      });

      return {
        betId,
        nftTokenId,
        transactionHash: tx.hash
      };
    } catch (error: any) {
      console.error('Failed to create bet:', error);
      throw new Error(`Failed to create bet: ${error.message}`);
    }
  }

  /**
   * Accept an existing bet
   */
  public async acceptBet(
    betId: number,
    acceptorSelection: string,
    amount: string,
    newMetadataURI: string
  ): Promise<{ transactionHash: string }> {
    if (!this.bettingContract) {
      throw new Error('Betting contract not initialized');
    }

    try {
      const amountWei = ethers.utils.parseEther(amount);
      
      const tx = await this.bettingContract.acceptBet(
        betId,
        acceptorSelection,
        newMetadataURI,
        { value: amountWei }
      );

      const receipt = await tx.wait();

      return {
        transactionHash: tx.hash
      };
    } catch (error: any) {
      console.error('Failed to accept bet:', error);
      throw new Error(`Failed to accept bet: ${error.message}`);
    }
  }

  /**
   * Resolve a bet on the blockchain
   */
  public async resolveBet(
    betId: number,
    winningSelection: string,
    finalMetadataURI: string
  ): Promise<{ transactionHash: string }> {
    if (!this.bettingContract) {
      throw new Error('Betting contract not initialized');
    }

    try {
      console.log('🚀 Resolving bet on blockchain...', {
        betId,
        winningSelection,
        finalMetadataURI
      });

      const tx = await this.bettingContract.resolveBet(
        betId,
        winningSelection,
        finalMetadataURI
      );

      console.log('📝 Resolution transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();
      
      console.log('✅ Bet resolved successfully!', receipt);

      return {
        transactionHash: tx.hash
      };
    } catch (error: any) {
      console.error('Failed to resolve bet:', error);
      throw new Error(`Failed to resolve bet: ${error.message}`);
    }
  }

  /**
   * Get bet details from blockchain
   */
  public async getBet(betId: number): Promise<any> {
    if (!this.bettingContract) {
      throw new Error('Betting contract not initialized');
    }

    try {
      const bet = await this.bettingContract.getBet(betId);
      return bet;
    } catch (error: any) {
      console.error('Failed to get bet:', error);
      throw new Error(`Failed to get bet: ${error.message}`);
    }
  }

  /**
   * Check if contracts are initialized
   */
  public isInitialized(): boolean {
    return !!(this.bettingContract && this.nftContract && this.signer);
  }

  /**
   * Check if wallet is connected (alias for isInitialized)
   */
  public isConnected(): boolean {
    return this.isInitialized();
  }

  /**
   * Reconnect wallet (alias for connectWallet)
   */
  public async reconnectWallet(): Promise<User> {
    return this.connectWallet();
  }

  /**
   * Verify real wallet connection (not just localStorage cache)
   */
  public async verifyWalletConnection(): Promise<{
    isConnected: boolean;
    account?: string;
    chainId?: string;
    error?: string;
  }> {
    try {
      console.log('🔍 Verifying wallet connection...');

      // Check if ethereum provider exists
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        return {
          isConnected: false,
          error: 'MetaMask not detected'
        };
      }

      const ethereum = (window as any).ethereum as EthereumProvider;

      // Check accounts
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        return {
          isConnected: false,
          error: 'No accounts connected'
        };
      }

      // Check network
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      
      console.log('✅ Wallet verification result:', {
        account: accounts[0],
        chainId,
        expectedChainId: CORE_NETWORK.chainId
      });

      return {
        isConnected: true,
        account: accounts[0],
        chainId
      };

    } catch (error: any) {
      console.error('❌ Wallet verification failed:', error);
      return {
        isConnected: false,
        error: error.message
      };
    }
  }

  /**
   * Comprehensive wallet status check
   */
  public async getWalletStatus(): Promise<{
    hasLocalStorageUser: boolean;
    localStorageUser: User | null;
    isServiceInitialized: boolean;
    walletVerification: any;
    accountMatch: boolean;
  }> {
    const localStorageUser = this.getCurrentUser();
    const isServiceInitialized = this.isInitialized();
    const walletVerification = await this.verifyWalletConnection();
    
    const accountMatch = localStorageUser && walletVerification.account ? 
      localStorageUser.walletAddress.toLowerCase() === walletVerification.account.toLowerCase() : 
      false;

    return {
      hasLocalStorageUser: !!localStorageUser,
      localStorageUser,
      isServiceInitialized,
      walletVerification,
      accountMatch
    };
  }

  /**
   * Get network info
   */
  public async getNetworkInfo(): Promise<{ chainId: number; name: string }> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const network = await this.provider.getNetwork();
      return {
        chainId: network.chainId,
        name: network.name
      };
    } catch (error: any) {
      console.error('Failed to get network info:', error);
      throw new Error(`Failed to get network info: ${error.message}`);
    }
  }

  /**
   * Get account balance
   */
  public async getBalance(address?: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const user = this.getCurrentUser();
      const targetAddress = address || user?.walletAddress;
      
      if (!targetAddress) {
        throw new Error('No address provided');
      }

      const balance = await this.provider.getBalance(targetAddress);
      return ethers.utils.formatEther(balance);
    } catch (error: any) {
      console.error('Failed to get balance:', error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();