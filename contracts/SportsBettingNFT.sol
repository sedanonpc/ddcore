// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SportsBettingNFT
 * @dev ERC721 NFT contract for representing sports betting participation certificates
 * Each NFT represents a user's participation in a specific bet
 */
contract SportsBettingNFT is ERC721, Ownable {
    // Counter for generating unique token IDs
    uint256 private _tokenIdCounter;
    
    // Mapping from token ID to metadata URI
    mapping(uint256 => string) private _tokenURIs;
    
    // Events
    event TokenURIUpdated(uint256 indexed tokenId, string newURI);
    event BetNFTMinted(uint256 indexed tokenId, address indexed bettor, string metadataURI);
    
    constructor() ERC721("SportsBettingNFT", "SBNFT") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }
    
    /**
     * @dev Mint a new NFT representing a bet participation
     * @param to Address to mint the NFT to
     * @param metadataURI Initial metadata URI for the NFT
     * @return tokenId The ID of the newly minted token
     */
    function mintBetNFT(address to, string memory metadataURI) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        _mint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);
        
        emit BetNFTMinted(tokenId, to, metadataURI);
        
        return tokenId;
    }
    
    /**
     * @dev Update the metadata URI for a specific token
     * @param tokenId The token ID to update
     * @param newURI The new metadata URI
     */
    function setTokenURI(uint256 tokenId, string memory newURI) 
        external 
        onlyOwner 
    {
        require(_ownerOf(tokenId) != address(0), "SportsBettingNFT: URI set of nonexistent token");
        _setTokenURI(tokenId, newURI);
        emit TokenURIUpdated(tokenId, newURI);
    }
    
    /**
     * @dev Internal function to set token URI
     * @param tokenId The token ID
     * @param uri The metadata URI
     */
    function _setTokenURI(uint256 tokenId, string memory uri) internal {
        _tokenURIs[tokenId] = uri;
    }
    
    /**
     * @dev Get the metadata URI for a token
     * @param tokenId The token ID
     * @return The metadata URI
     */
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        require(_ownerOf(tokenId) != address(0), "SportsBettingNFT: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }
    
    /**
     * @dev Get the current token ID counter value
     * @return The current token ID counter
     */
    function getCurrentTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Override supportsInterface to include ERC721 interfaces
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}
