// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ChittyChainEscrow is ReentrancyGuard, AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant NOTARY_ROLE = keccak256("NOTARY_ROLE");
    
    enum EscrowState {
        INITIATED,
        DOCUMENTS_SUBMITTED,
        COUNTY_VERIFIED,
        FUNDS_DEPOSITED,
        COMPLETED,
        CANCELLED
    }
    
    struct PropertyEscrow {
        uint256 tokenId;
        address propertyContract;
        address seller;
        address buyer;
        uint256 salePrice;
        uint256 depositAmount;
        string deedHash;
        string countyFilingNumber;
        EscrowState state;
        uint256 createdAt;
        uint256 closingDate;
        bool sellerSigned;
        bool buyerSigned;
        bool countyVerified;
    }
    
    struct DivorceSettlement {
        uint256 caseId;
        uint256 tokenId;
        address propertyContract;
        address spouse1;
        address spouse2;
        uint256 spouse1Percentage;
        uint256 spouse2Percentage;
        string courtOrderHash;
        bool spouse1Signed;
        bool spouse2Signed;
        bool courtApproved;
        uint256 createdAt;
    }
    
    mapping(uint256 => PropertyEscrow) public escrows;
    mapping(uint256 => DivorceSettlement) public divorceSettlements;
    mapping(bytes32 => uint256) public deedHashToEscrow;
    
    uint256 public escrowCounter;
    uint256 public settlementCounter;
    
    event EscrowCreated(uint256 escrowId, address seller, address buyer, uint256 tokenId);
    event DocumentsSubmitted(uint256 escrowId, string deedHash);
    event CountyVerified(uint256 escrowId, string filingNumber);
    event EscrowCompleted(uint256 escrowId);
    event DivorceSettlementCreated(uint256 settlementId, uint256 tokenId);
    event SettlementExecuted(uint256 settlementId);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }
    
    function createPropertyEscrow(
        address propertyContract,
        uint256 tokenId,
        address buyer,
        uint256 salePrice,
        uint256 closingDate
    ) external nonReentrant returns (uint256) {
        IERC721 property = IERC721(propertyContract);
        require(property.ownerOf(tokenId) == msg.sender, "Not the owner");
        
        escrowCounter++;
        uint256 escrowId = escrowCounter;
        
        escrows[escrowId] = PropertyEscrow({
            tokenId: tokenId,
            propertyContract: propertyContract,
            seller: msg.sender,
            buyer: buyer,
            salePrice: salePrice,
            depositAmount: 0,
            deedHash: "",
            countyFilingNumber: "",
            state: EscrowState.INITIATED,
            createdAt: block.timestamp,
            closingDate: closingDate,
            sellerSigned: false,
            buyerSigned: false,
            countyVerified: false
        });
        
        // Transfer property to escrow
        property.transferFrom(msg.sender, address(this), tokenId);
        
        emit EscrowCreated(escrowId, msg.sender, buyer, tokenId);
        return escrowId;
    }
    
    function submitDocuments(
        uint256 escrowId,
        string memory deedHash
    ) external {
        PropertyEscrow storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.INITIATED, "Invalid state");
        require(msg.sender == escrow.seller || msg.sender == escrow.buyer, "Not a party");
        
        escrow.deedHash = deedHash;
        escrow.state = EscrowState.DOCUMENTS_SUBMITTED;
        deedHashToEscrow[keccak256(bytes(deedHash))] = escrowId;
        
        emit DocumentsSubmitted(escrowId, deedHash);
    }
    
    function verifyCountyFiling(
        uint256 escrowId,
        string memory filingNumber
    ) external onlyRole(ORACLE_ROLE) {
        PropertyEscrow storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.DOCUMENTS_SUBMITTED, "Documents not submitted");
        
        escrow.countyFilingNumber = filingNumber;
        escrow.countyVerified = true;
        escrow.state = EscrowState.COUNTY_VERIFIED;
        
        emit CountyVerified(escrowId, filingNumber);
    }
    
    function depositFunds(uint256 escrowId) external payable {
        PropertyEscrow storage escrow = escrows[escrowId];
        require(msg.sender == escrow.buyer, "Only buyer can deposit");
        require(escrow.state == EscrowState.COUNTY_VERIFIED, "Not verified");
        require(msg.value >= escrow.salePrice, "Insufficient funds");
        
        escrow.depositAmount = msg.value;
        escrow.state = EscrowState.FUNDS_DEPOSITED;
    }
    
    function signEscrow(uint256 escrowId) external {
        PropertyEscrow storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.FUNDS_DEPOSITED, "Funds not deposited");
        
        if (msg.sender == escrow.seller) {
            escrow.sellerSigned = true;
        } else if (msg.sender == escrow.buyer) {
            escrow.buyerSigned = true;
        } else {
            revert("Not a party");
        }
        
        if (escrow.sellerSigned && escrow.buyerSigned) {
            _completeEscrow(escrowId);
        }
    }
    
    function _completeEscrow(uint256 escrowId) private {
        PropertyEscrow storage escrow = escrows[escrowId];
        
        // Transfer property to buyer
        IERC721(escrow.propertyContract).transferFrom(
            address(this),
            escrow.buyer,
            escrow.tokenId
        );
        
        // Transfer funds to seller
        payable(escrow.seller).transfer(escrow.salePrice);
        
        // Refund excess to buyer
        if (escrow.depositAmount > escrow.salePrice) {
            payable(escrow.buyer).transfer(escrow.depositAmount - escrow.salePrice);
        }
        
        escrow.state = EscrowState.COMPLETED;
        emit EscrowCompleted(escrowId);
    }
    
    // Divorce settlement functions
    function createDivorceSettlement(
        uint256 caseId,
        address propertyContract,
        uint256 tokenId,
        address spouse1,
        address spouse2,
        uint256 spouse1Percentage,
        uint256 spouse2Percentage
    ) external onlyRole(NOTARY_ROLE) returns (uint256) {
        require(spouse1Percentage + spouse2Percentage == 100, "Percentages must sum to 100");
        
        settlementCounter++;
        uint256 settlementId = settlementCounter;
        
        divorceSettlements[settlementId] = DivorceSettlement({
            caseId: caseId,
            tokenId: tokenId,
            propertyContract: propertyContract,
            spouse1: spouse1,
            spouse2: spouse2,
            spouse1Percentage: spouse1Percentage,
            spouse2Percentage: spouse2Percentage,
            courtOrderHash: "",
            spouse1Signed: false,
            spouse2Signed: false,
            courtApproved: false,
            createdAt: block.timestamp
        });
        
        emit DivorceSettlementCreated(settlementId, tokenId);
        return settlementId;
    }
    
    function approveSettlement(uint256 settlementId, string memory courtOrderHash) 
        external onlyRole(ORACLE_ROLE) {
        DivorceSettlement storage settlement = divorceSettlements[settlementId];
        settlement.courtOrderHash = courtOrderHash;
        settlement.courtApproved = true;
    }
    
    function signSettlement(uint256 settlementId) external {
        DivorceSettlement storage settlement = divorceSettlements[settlementId];
        require(settlement.courtApproved, "Court approval required");
        
        if (msg.sender == settlement.spouse1) {
            settlement.spouse1Signed = true;
        } else if (msg.sender == settlement.spouse2) {
            settlement.spouse2Signed = true;
        } else {
            revert("Not a party");
        }
        
        if (settlement.spouse1Signed && settlement.spouse2Signed) {
            _executeSettlement(settlementId);
        }
    }
    
    function _executeSettlement(uint256 settlementId) private {
        DivorceSettlement storage settlement = divorceSettlements[settlementId];
        
        // This would call the property contract's splitOwnership function
        // Implementation depends on property contract interface
        
        emit SettlementExecuted(settlementId);
    }
}