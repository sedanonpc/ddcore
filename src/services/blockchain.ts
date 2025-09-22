import { ethers } from 'ethers';
import { EthereumProvider, User } from '../types';

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
  private provider: ethers.providers.Web3Provider | null = null;
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
    'function mintBetNFT(address to, string memory metadataURI) external returns (uint256)',
    'function setTokenURI(uint256 tokenId, string memory newURI) external',
    'function tokenURI(uint256 tokenId) external view returns (string)',
    'function getCurrentTokenId() external view returns (uint256)',
    'event BetNFTMinted(uint256 indexed tokenId, address indexed bettor, string metadataURI)'
  ];

  /**
   * Check if MetaMask is installed
   */
  public isMetaMaskInstalled(): boolean {
    return typeof window.ethereum !== 'undefined';
  }

  /**
   * Connect to MetaMask wallet
   */
  public async connectWallet(): Promise<User> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum!.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your MetaMask wallet.');
      }

      // Initialize provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum!);
      this.signer = this.provider.getSigner();

      const walletAddress = accounts[0];

      // Switch to Core Testnet2 if not already connected
      await this.switchToCoreFallback();

      // Initialize contracts
      this.initializeContracts();

      // Generate username for the user
      const username = this.generateUsername();

      // Store user data in localStorage
      const user: User = { username, walletAddress };
      localStorage.setItem('user', JSON.stringify(user));

      return user;
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  }

  /**
   * Switch to Core Testnet2 network
   */
  private async switchToCore(): Promise<void> {
    try {
      // Try to switch to Core Testnet2
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CORE_NETWORK.chainId }],
      });
    } catch (switchError: any) {
      // If the network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum!.request({
            method: 'wallet_addEthereumChain',
            params: [CORE_NETWORK],
          });
        } catch (addError) {
          console.error('Failed to add Core network:', addError);
          throw new Error('Failed to add Core Testnet2 network to MetaMask');
        }
      } else {
        console.error('Failed to switch to Core network:', switchError);
        throw new Error('Failed to switch to Core Testnet2 network');
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

    const bettingAddress = process.env.REACT_APP_BETTING_CONTRACT_ADDRESS;
    const nftAddress = process.env.REACT_APP_NFT_CONTRACT_ADDRESS;

    console.log('Environment variables check:');
    console.log('REACT_APP_BETTING_CONTRACT_ADDRESS:', bettingAddress);
    console.log('REACT_APP_NFT_CONTRACT_ADDRESS:', nftAddress);

    if (!bettingAddress || !nftAddress) {
      console.error('Contract addresses not found in environment variables');
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));
      return;
    }

    this.bettingContract = new ethers.Contract(bettingAddress, this.BETTING_ABI, this.signer);
    this.nftContract = new ethers.Contract(nftAddress, this.NFT_ABI, this.signer);
    
    console.log('Contracts initialized successfully');
    console.log('Betting contract address:', bettingAddress);
    console.log('NFT contract address:', nftAddress);
  }

  /**
   * Generate a random username using the username generator utility
   */
  private generateUsername(): string {
    // Import and use the username generator
    const { usernameGenerator } = require('../utils/username');
    return usernameGenerator.generateUsername();
  }

  /**
   * Get current user from localStorage
   */
  public getCurrentUser(): User | null {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
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
      throw new Error('Betting contract not initialized');
    }

    try {
      const amountWei = ethers.utils.parseEther(amount);
      
      const tx = await this.bettingContract.createBet(
        matchId,
        creatorSelection,
        metadataURI,
        { value: amountWei }
      );

      const receipt = await tx.wait();
      
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

      return {
        betId,
        nftTokenId,
        transactionHash: receipt.transactionHash,
      };
    } catch (error: any) {
      console.error('Create bet failed:', error);
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
  ): Promise<string> {
    if (!this.bettingContract) {
      throw new Error('Betting contract not initialized');
    }

    try {
      console.log('AcceptBet params:', { betId, acceptorSelection, amount, newMetadataURI });
      
      const amountWei = ethers.utils.parseEther(amount);
      console.log('Amount in Wei:', amountWei.toString());
      
      const tx = await this.bettingContract.acceptBet(
        betId,
        acceptorSelection,
        newMetadataURI,
        { value: amountWei }
      );

      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error: any) {
      console.error('Accept bet failed:', error);
      throw new Error(`Failed to accept bet: ${error.message}`);
    }
  }

  /**
   * Resolve a bet (admin only)
   */
  public async resolveBet(
    betId: number,
    winningSelection: string,
    finalMetadataURI: string
  ): Promise<string> {
    if (!this.bettingContract) {
      throw new Error('Betting contract not initialized');
    }

    try {
      console.log('🔗 BLOCKCHAIN: Sending resolveBet transaction', {
        betId,
        winningSelection,
        finalMetadataURI
      });

      const tx = await this.bettingContract.resolveBet(
        betId,
        winningSelection,
        finalMetadataURI
      );

      console.log('🔗 BLOCKCHAIN: Transaction sent, waiting for confirmation', {
        transactionHash: tx.hash,
        betId
      });

      const receipt = await tx.wait();
      
      console.log('🔗 BLOCKCHAIN: Transaction confirmed', {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        betId
      });

      // Log any events emitted by the transaction
      if (receipt.events && receipt.events.length > 0) {
        console.log('🔗 BLOCKCHAIN: Events emitted:', receipt.events.map((event: any) => ({
          event: event.event,
          args: event.args
        })));
      }

      return receipt.transactionHash;
    } catch (error: any) {
      console.error('🔗 BLOCKCHAIN: Resolve bet failed:', error);
      throw new Error(`Failed to resolve bet: ${error.message}`);
    }
  }

  /**
   * Get bet information from blockchain
   */
  public async getBet(betId: number): Promise<any> {
    if (!this.bettingContract) {
      throw new Error('Betting contract not initialized');
    }

    try {
      const bet = await this.bettingContract.getBet(betId);
      return {
        id: bet.id.toNumber(),
        matchId: bet.matchId,
        creator: bet.creator,
        acceptor: bet.acceptor,
        amount: ethers.utils.formatEther(bet.amount),
        status: bet.status,
        creatorSelection: bet.creatorSelection,
        acceptorSelection: bet.acceptorSelection,
        winner: bet.winner,
        nftTokenId: bet.nftTokenId.toNumber(),
        createdAt: new Date(bet.createdAt.toNumber() * 1000),
        resolvedAt: bet.resolvedAt.toNumber() > 0 ? new Date(bet.resolvedAt.toNumber() * 1000) : null,
      };
    } catch (error: any) {
      console.error('Get bet failed:', error);
      throw new Error(`Failed to get bet: ${error.message}`);
    }
  }

  /**
   * Switch to Core Testnet2 network
   */
  private async switchToCoreFallback(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask is required');
    }

    try {
      // Check current network
      const network = await this.provider!.getNetwork();
      if (network.chainId === 1114) {
        // Already on Core Testnet2
        return;
      }

      // Try to switch to Core Testnet2
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CORE_NETWORK.chainId }],
      });
    } catch (switchError: any) {
      // If the network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [CORE_NETWORK],
          });
        } catch (addError) {
          console.error('Failed to add Core Testnet2:', addError);
          throw new Error('Please manually add Core Testnet2 to MetaMask');
        }
      } else {
        console.error('Failed to switch to Core Testnet2:', switchError);
        throw new Error('Please manually switch to Core Testnet2 in MetaMask');
      }
    }
  }

  /**
   * Reconnect to wallet if user data exists in localStorage
   * Call this on page load to restore wallet connection
   */
  public async reconnectWallet(): Promise<boolean> {
    try {
      // Check if user data exists in localStorage
      const userData = localStorage.getItem('user');
      if (!userData) {
        return false;
      }

      // Check if MetaMask is available
      if (!this.isMetaMaskInstalled()) {
        return false;
      }

      // Check if MetaMask is already connected
      const accounts = await window.ethereum!.request({ 
        method: 'eth_accounts' 
      });
      
      if (accounts.length === 0) {
        // User is no longer connected in MetaMask
        this.disconnect();
        return false;
      }

      // Reinitialize provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum!);
      this.signer = this.provider.getSigner();
      
      // Reinitialize contracts
      this.initializeContracts();
      
      console.log('Wallet reconnected successfully');
      return true;
      
    } catch (error: any) {
      console.error('Failed to reconnect wallet:', error);
      this.disconnect(); // Clear any partial state
      return false;
    }
  }

  /**
   * Check if wallet is connected and provider is initialized
   */
  public isConnected(): boolean {
    return !!(this.provider && this.signer);
  }

  /**
   * Get user's wallet balance
   */
  public async getBalance(): Promise<string> {
    if (!this.provider || !this.signer) {
      throw new Error('Provider not initialized');
    }

    try {
      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error: any) {
      console.error('Get balance failed:', error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
