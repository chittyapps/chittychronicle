// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ChittyChainProperty is ERC721, AccessControl {
    using Counters for Counters.Counter;
    
    bytes32 public constant NOTARY_ROLE = keccak256("NOTARY_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    
    Counters.Counter private _tokenIds;
    
    struct PropertyData {
        string parcelId;
        string legalDescription;
        string gpsPolygon;
        string vestingType; // JT, TIC, LLC, etc.
        string deedHash;
        uint256 mintedAt;
        uint256 lastTransferAt;
        address[] owners;
        uint256[] ownershipPercentages;
        bool isLocked; // For escrow/dispute
    }
    
    mapping(uint256 => PropertyData) public properties;
    mapping(string => uint256) public parcelToTokenId;
    mapping(uint256 => string[]) public tokenDocuments; // IPFS hashes
    
    event PropertyMinted(uint256 tokenId, string parcelId, string deedHash);
    event OwnershipSplit(uint256 tokenId, address[] newOwners, uint256[] percentages);
    event PropertyLocked(uint256 tokenId, string reason);
    event PropertyUnlocked(uint256 tokenId);
    event DocumentAdded(uint256 tokenId, string documentHash);
    
    constructor() ERC721("ChittyChain Property", "HOUSE") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(NOTARY_ROLE, msg.sender);
    }
    
    function mintProperty(
        string memory parcelId,
        string memory legalDescription,
        string memory gpsPolygon,
        string memory vestingType,
        string memory deedHash,
        address owner
    ) public onlyRole(NOTARY_ROLE) returns (uint256) {
        require(parcelToTokenId[parcelId] == 0, "Property already tokenized");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(owner, newTokenId);
        
        address[] memory owners = new address[](1);
        owners[0] = owner;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 100;
        
        properties[newTokenId] = PropertyData({
            parcelId: parcelId,
            legalDescription: legalDescription,
            gpsPolygon: gpsPolygon,
            vestingType: vestingType,
            deedHash: deedHash,
            mintedAt: block.timestamp,
            lastTransferAt: block.timestamp,
            owners: owners,
            ownershipPercentages: percentages,
            isLocked: false
        });
        
        parcelToTokenId[parcelId] = newTokenId;
        
        emit PropertyMinted(newTokenId, parcelId, deedHash);
        return newTokenId;
    }
    
    function splitOwnership(
        uint256 tokenId,
        address[] memory newOwners,
        uint256[] memory percentages
    ) public onlyRole(ORACLE_ROLE) {
        require(_exists(tokenId), "Property does not exist");
        require(!properties[tokenId].isLocked, "Property is locked");
        require(newOwners.length == percentages.length, "Arrays must match");
        
        uint256 totalPercentage = 0;
        for (uint i = 0; i < percentages.length; i++) {
            totalPercentage += percentages[i];
        }
        require(totalPercentage == 100, "Percentages must sum to 100");
        
        properties[tokenId].owners = newOwners;
        properties[tokenId].ownershipPercentages = percentages;
        properties[tokenId].lastTransferAt = block.timestamp;
        
        emit OwnershipSplit(tokenId, newOwners, percentages);
    }
    
    function lockProperty(uint256 tokenId, string memory reason) public onlyRole(ORACLE_ROLE) {
        require(_exists(tokenId), "Property does not exist");
        properties[tokenId].isLocked = true;
        emit PropertyLocked(tokenId, reason);
    }
    
    function unlockProperty(uint256 tokenId) public onlyRole(ORACLE_ROLE) {
        require(_exists(tokenId), "Property does not exist");
        properties[tokenId].isLocked = false;
        emit PropertyUnlocked(tokenId);
    }
    
    function addDocument(uint256 tokenId, string memory documentHash) public onlyRole(NOTARY_ROLE) {
        require(_exists(tokenId), "Property does not exist");
        tokenDocuments[tokenId].push(documentHash);
        emit DocumentAdded(tokenId, documentHash);
    }
    
    // Override transfer to check if property is locked
    function _transfer(address from, address to, uint256 tokenId) internal override {
        require(!properties[tokenId].isLocked, "Property is locked");
        super._transfer(from, to, tokenId);
        properties[tokenId].lastTransferAt = block.timestamp;
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}