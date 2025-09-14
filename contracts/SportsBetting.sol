// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SportsBettingNFT.sol";

/**
 * @title SportsBetting
 * @dev Main betting contract that handles escrow, bet creation, acceptance, and resolution
 * Integrates with SportsBettingNFT to mint participation certificates
 */
contract SportsBetting {
    // Bet status enumeration
    enum BetStatus { Open, Accepted, Resolved, Cancelled }
    
    // Bet structure containing all bet information
    struct Bet {
        uint256 id;
        string matchId;
        address creator;
        address acceptor;
        uint256 amount;
        BetStatus status;
        string creatorSelection;
        string acceptorSelection;
        string winner; // The winning selection (creatorSelection or acceptorSelection)
        uint256 nftTokenId;
        uint256 createdAt;
        uint256 resolvedAt;
    }
    
    // State variables
    SportsBettingNFT public nftContract;
    address public owner;
    uint256 private _betIdCounter;
    
    // Mappings
    mapping(uint256 => Bet) public bets;
    mapping(address => uint256[]) public userBets;
    mapping(string => uint256[]) public matchBets;
    
    // Events
    event BetCreated(
        uint256 indexed betId,
        string indexed matchId,
        address indexed creator,
        uint256 amount,
        string creatorSelection,
        uint256 nftTokenId
    );
    
    event BetAccepted(
        uint256 indexed betId,
        address indexed acceptor,
        string acceptorSelection
    );
    
    event BetResolved(
        uint256 indexed betId,
        string winner,
        address winnerAddress,
        uint256 payout
    );
    
    event BetCancelled(uint256 indexed betId);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "SportsBetting: caller is not the owner");
        _;
    }
    
    modifier validBet(uint256 betId) {
        require(betId > 0 && betId <= _betIdCounter, "SportsBetting: invalid bet ID");
        _;
    }
    
    constructor(address _nftContract) {
        owner = msg.sender;
        nftContract = SportsBettingNFT(_nftContract);
        _betIdCounter = 0;
    }
    
    /**
     * @dev Create a new bet with escrow deposit
     * @param matchId The match identifier
     * @param creatorSelection The creator's selection/prediction
     * @param metadataURI Initial metadata URI for the NFT
     * @return betId The ID of the created bet
     */
    function createBet(
        string memory matchId,
        string memory creatorSelection,
        string memory metadataURI
    ) external payable returns (uint256) {
        require(msg.value > 0, "SportsBetting: bet amount must be greater than 0");
        require(bytes(matchId).length > 0, "SportsBetting: match ID cannot be empty");
        require(bytes(creatorSelection).length > 0, "SportsBetting: creator selection cannot be empty");
        
        _betIdCounter++;
        uint256 betId = _betIdCounter;
        
        // Mint NFT for this bet
        uint256 nftTokenId = nftContract.mintBetNFT(msg.sender, metadataURI);
        
        // Create bet struct
        bets[betId] = Bet({
            id: betId,
            matchId: matchId,
            creator: msg.sender,
            acceptor: address(0),
            amount: msg.value,
            status: BetStatus.Open,
            creatorSelection: creatorSelection,
            acceptorSelection: "",
            winner: "",
            nftTokenId: nftTokenId,
            createdAt: block.timestamp,
            resolvedAt: 0
        });
        
        // Update mappings
        userBets[msg.sender].push(betId);
        matchBets[matchId].push(betId);
        
        emit BetCreated(betId, matchId, msg.sender, msg.value, creatorSelection, nftTokenId);
        
        return betId;
    }
    
    /**
     * @dev Accept an open bet by depositing matching amount
     * @param betId The ID of the bet to accept
     * @param acceptorSelection The acceptor's selection/prediction
     * @param newMetadataURI Updated metadata URI including acceptor information
     */
    function acceptBet(
        uint256 betId,
        string memory acceptorSelection,
        string memory newMetadataURI
    ) external payable validBet(betId) {
        Bet storage bet = bets[betId];
        
        require(bet.status == BetStatus.Open, "SportsBetting: bet is not open");
        require(msg.sender != bet.creator, "SportsBetting: cannot accept own bet");
        require(msg.value == bet.amount, "SportsBetting: incorrect bet amount");
        require(bytes(acceptorSelection).length > 0, "SportsBetting: acceptor selection cannot be empty");
        
        // Update bet information
        bet.acceptor = msg.sender;
        bet.acceptorSelection = acceptorSelection;
        bet.status = BetStatus.Accepted;
        
        // Update user bets mapping
        userBets[msg.sender].push(betId);
        
        // Update NFT metadata to include acceptor information
        nftContract.setTokenURI(bet.nftTokenId, newMetadataURI);
        
        emit BetAccepted(betId, msg.sender, acceptorSelection);
    }
    
    /**
     * @dev Resolve a bet by determining the winner and releasing funds
     * @param betId The ID of the bet to resolve
     * @param winningSelection The winning selection (should match either creator or acceptor selection)
     * @param finalMetadataURI Final metadata URI reflecting the resolution
     */
    function resolveBet(
        uint256 betId,
        string memory winningSelection,
        string memory finalMetadataURI
    ) external onlyOwner validBet(betId) {
        Bet storage bet = bets[betId];
        
        require(bet.status == BetStatus.Accepted, "SportsBetting: bet is not accepted");
        require(bytes(winningSelection).length > 0, "SportsBetting: winning selection cannot be empty");
        
        // Determine winner
        address winnerAddress;
        bool isCreatorWinner = keccak256(abi.encodePacked(winningSelection)) == 
                              keccak256(abi.encodePacked(bet.creatorSelection));
        bool isAcceptorWinner = keccak256(abi.encodePacked(winningSelection)) == 
                               keccak256(abi.encodePacked(bet.acceptorSelection));
        
        require(isCreatorWinner || isAcceptorWinner, "SportsBetting: invalid winning selection");
        
        if (isCreatorWinner) {
            winnerAddress = bet.creator;
        } else {
            winnerAddress = bet.acceptor;
        }
        
        // Calculate payout (total escrow amount)
        uint256 payout = bet.amount * 2;
        
        // Update bet status
        bet.status = BetStatus.Resolved;
        bet.winner = winningSelection;
        bet.resolvedAt = block.timestamp;
        
        // Update NFT metadata to reflect resolution
        nftContract.setTokenURI(bet.nftTokenId, finalMetadataURI);
        
        // Transfer winnings to winner
        (bool success, ) = winnerAddress.call{value: payout}("");
        require(success, "SportsBetting: failed to transfer winnings");
        
        emit BetResolved(betId, winningSelection, winnerAddress, payout);
    }
    
    /**
     * @dev Cancel an open bet and refund the creator
     * @param betId The ID of the bet to cancel
     */
    function cancelBet(uint256 betId) external validBet(betId) {
        Bet storage bet = bets[betId];
        
        require(bet.status == BetStatus.Open, "SportsBetting: bet is not open");
        require(msg.sender == bet.creator || msg.sender == owner, "SportsBetting: unauthorized");
        
        bet.status = BetStatus.Cancelled;
        
        // Refund creator
        (bool success, ) = bet.creator.call{value: bet.amount}("");
        require(success, "SportsBetting: failed to refund creator");
        
        emit BetCancelled(betId);
    }
    
    /**
     * @dev Get bet information by ID
     * @param betId The bet ID
     * @return The bet struct
     */
    function getBet(uint256 betId) external view validBet(betId) returns (Bet memory) {
        return bets[betId];
    }
    
    /**
     * @dev Get all bet IDs for a user
     * @param user The user address
     * @return Array of bet IDs
     */
    function getUserBets(address user) external view returns (uint256[] memory) {
        return userBets[user];
    }
    
    /**
     * @dev Get all bet IDs for a match
     * @param matchId The match identifier
     * @return Array of bet IDs
     */
    function getMatchBets(string memory matchId) external view returns (uint256[] memory) {
        return matchBets[matchId];
    }
    
    /**
     * @dev Get the current bet counter value
     * @return The current bet counter
     */
    function getCurrentBetId() external view returns (uint256) {
        return _betIdCounter;
    }
    
    /**
     * @dev Get contract balance
     * @return The contract's ETH balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Emergency withdrawal function (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "SportsBetting: emergency withdrawal failed");
    }
}
