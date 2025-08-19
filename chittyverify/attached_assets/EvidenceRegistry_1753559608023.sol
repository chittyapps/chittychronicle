// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ChittyChain Evidence Registry
 * @notice Immutable on-chain evidence tracking with enhanced validation
 * @dev Implements tiered evidence system with corroboration requirements
 */
contract EvidenceRegistry is Ownable, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;
    
    // Evidence tiers
    enum EvidenceTier {
        PERSONAL,      // Weight 0.0 - 0.5
        THIRD_PARTY,   // Weight 0.5 - 0.7
        FINANCIAL,     // Weight 0.7 - 0.9
        GOVERNMENT     // Weight 0.9 - 1.0
    }
    
    // Evidence status
    enum EvidenceStatus {
        PENDING,
        MINTED,
        REQUIRES_CORROBORATION,
        REJECTED,
        DISPUTED
    }
    
    // Authentication methods
    enum AuthMethod {
        NONE,
        DIGITAL_SIGNATURE,
        DIGITAL_SEAL,
        NOTARIZED,
        BLOCKCHAIN_VERIFIED
    }
    
    struct Evidence {
        string artifactId;
        string contentHash;
        string caseId;
        uint256 weight; // Stored as integer 0-100
        EvidenceTier tier;
        AuthMethod authMethod;
        uint256 timestamp;
        address minter;
        uint256 blockNumber;
        EvidenceStatus status;
        string metadata; // JSON string for flexibility
        uint256 corroborationCount;
        mapping(string => bool) corroborations;
    }
    
    struct Contradiction {
        string evidenceId1;
        string evidenceId2;
        string contradictionType;
        string description;
        uint256 reportedAt;
        address reporter;
        bool resolved;
    }
    
    // State variables
    Counters.Counter private _evidenceCounter;
    Counters.Counter private _contradictionCounter;
    
    mapping(string => Evidence) public evidenceRegistry;
    mapping(string => bool) public contentHashExists;
    mapping(string => string[]) public caseEvidence;
    mapping(address => string[]) public minterEvidence;
    mapping(uint256 => Contradiction) public contradictions;
    
    // Authorized validators
    mapping(address => bool) public validators;
    
    // Minting thresholds
    uint256 public constant GOVERNMENT_THRESHOLD = 90;
    uint256 public constant FINANCIAL_THRESHOLD = 95;
    uint256 public constant THIRD_PARTY_THRESHOLD = 90;
    
    // Events
    event EvidenceMinted(
        string indexed artifactId,
        string indexed caseId,
        address indexed minter,
        uint256 weight,
        EvidenceTier tier
    );
    
    event EvidenceCorroborated(
        string indexed artifactId,
        string corroboratingEvidence,
        address corroborator
    );
    
    event ContradictionReported(
        uint256 indexed contradictionId,
        string evidenceId1,
        string evidenceId2,
        address reporter
    );
    
    event EvidenceDisputed(
        string indexed artifactId,
        string reason,
        address disputer
    );
    
    modifier onlyValidator() {
        require(validators[msg.sender] || owner() == msg.sender, "Not authorized validator");
        _;
    }
    
    modifier validWeight(uint256 _weight) {
        require(_weight <= 100, "Weight must be 0-100");
        _;
    }
    
    constructor() {
        validators[msg.sender] = true;
    }
    
    /**
     * @notice Mint new evidence to the blockchain
     * @param _artifactId Unique identifier for the artifact
     * @param _contentHash SHA3-256 hash of the evidence content
     * @param _caseId Associated case identifier
     * @param _weight Evidence weight (0-100)
     * @param _tier Evidence tier classification
     * @param _authMethod Authentication method used
     * @param _metadata Additional metadata as JSON string
     */
    function mintEvidence(
        string memory _artifactId,
        string memory _contentHash,
        string memory _caseId,
        uint256 _weight,
        EvidenceTier _tier,
        AuthMethod _authMethod,
        string memory _metadata
    ) external nonReentrant whenNotPaused validWeight(_weight) {
        require(bytes(_artifactId).length > 0, "Invalid artifact ID");
        require(bytes(_contentHash).length > 0, "Invalid content hash");
        require(!contentHashExists[_contentHash], "Evidence already minted");
        require(evidenceRegistry[_artifactId].timestamp == 0, "Artifact ID already exists");
        
        // Validate minting criteria
        require(
            _canMint(_weight, _tier, _authMethod),
            "Evidence does not meet minting criteria"
        );
        
        // Create evidence record
        Evidence storage newEvidence = evidenceRegistry[_artifactId];
        newEvidence.artifactId = _artifactId;
        newEvidence.contentHash = _contentHash;
        newEvidence.caseId = _caseId;
        newEvidence.weight = _weight;
        newEvidence.tier = _tier;
        newEvidence.authMethod = _authMethod;
        newEvidence.timestamp = block.timestamp;
        newEvidence.minter = msg.sender;
        newEvidence.blockNumber = block.number;
        newEvidence.status = EvidenceStatus.MINTED;
        newEvidence.metadata = _metadata;
        newEvidence.corroborationCount = 0;
        
        // Update mappings
        contentHashExists[_contentHash] = true;
        caseEvidence[_caseId].push(_artifactId);
        minterEvidence[msg.sender].push(_artifactId);
        
        _evidenceCounter.increment();
        
        emit EvidenceMinted(_artifactId, _caseId, msg.sender, _weight, _tier);
    }
    
    /**
     * @notice Add corroboration to existing evidence
     * @param _artifactId Evidence to corroborate
     * @param _corroboratingEvidence ID of corroborating evidence
     */
    function corroborateEvidence(
        string memory _artifactId,
        string memory _corroboratingEvidence
    ) external nonReentrant whenNotPaused {
        Evidence storage evidence = evidenceRegistry[_artifactId];
        require(evidence.timestamp > 0, "Evidence not found");
        require(
            evidenceRegistry[_corroboratingEvidence].timestamp > 0,
            "Corroborating evidence not found"
        );
        require(
            !evidence.corroborations[_corroboratingEvidence],
            "Already corroborated with this evidence"
        );
        
        evidence.corroborations[_corroboratingEvidence] = true;
        evidence.corroborationCount++;
        
        // Update status if enough corroborations
        if (evidence.status == EvidenceStatus.REQUIRES_CORROBORATION) {
            if (_hasEnoughCorroboration(evidence)) {
                evidence.status = EvidenceStatus.MINTED;
            }
        }
        
        emit EvidenceCorroborated(_artifactId, _corroboratingEvidence, msg.sender);
    }
    
    /**
     * @notice Report contradiction between evidences
     * @param _evidenceId1 First evidence ID
     * @param _evidenceId2 Second evidence ID
     * @param _contradictionType Type of contradiction
     * @param _description Detailed description
     */
    function reportContradiction(
        string memory _evidenceId1,
        string memory _evidenceId2,
        string memory _contradictionType,
        string memory _description
    ) external nonReentrant whenNotPaused {
        require(evidenceRegistry[_evidenceId1].timestamp > 0, "Evidence 1 not found");
        require(evidenceRegistry[_evidenceId2].timestamp > 0, "Evidence 2 not found");
        require(
            keccak256(bytes(evidenceRegistry[_evidenceId1].caseId)) == 
            keccak256(bytes(evidenceRegistry[_evidenceId2].caseId)),
            "Evidence must be from same case"
        );
        
        uint256 contradictionId = _contradictionCounter.current();
        _contradictionCounter.increment();
        
        Contradiction storage newContradiction = contradictions[contradictionId];
        newContradiction.evidenceId1 = _evidenceId1;
        newContradiction.evidenceId2 = _evidenceId2;
        newContradiction.contradictionType = _contradictionType;
        newContradiction.description = _description;
        newContradiction.reportedAt = block.timestamp;
        newContradiction.reporter = msg.sender;
        newContradiction.resolved = false;
        
        emit ContradictionReported(contradictionId, _evidenceId1, _evidenceId2, msg.sender);
    }
    
    /**
     * @notice Dispute evidence validity
     * @param _artifactId Evidence to dispute
     * @param _reason Reason for dispute
     */
    function disputeEvidence(
        string memory _artifactId,
        string memory _reason
    ) external nonReentrant whenNotPaused {
        Evidence storage evidence = evidenceRegistry[_artifactId];
        require(evidence.timestamp > 0, "Evidence not found");
        require(evidence.status != EvidenceStatus.DISPUTED, "Already disputed");
        
        evidence.status = EvidenceStatus.DISPUTED;
        
        emit EvidenceDisputed(_artifactId, _reason, msg.sender);
    }
    
    /**
     * @notice Resolve contradiction (validators only)
     * @param _contradictionId Contradiction to resolve
     */
    function resolveContradiction(uint256 _contradictionId) external onlyValidator {
        Contradiction storage contradiction = contradictions[_contradictionId];
        require(contradiction.reportedAt > 0, "Contradiction not found");
        require(!contradiction.resolved, "Already resolved");
        
        contradiction.resolved = true;
    }
    
    /**
     * @notice Add validator address
     * @param _validator Address to add as validator
     */
    function addValidator(address _validator) external onlyOwner {
        validators[_validator] = true;
    }
    
    /**
     * @notice Remove validator address
     * @param _validator Address to remove as validator
     */
    function removeValidator(address _validator) external onlyOwner {
        validators[_validator] = false;
    }
    
    /**
     * @notice Pause contract (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Get evidence details
     * @param _artifactId Evidence identifier
     */
    function getEvidence(string memory _artifactId) external view returns (
        string memory contentHash,
        string memory caseId,
        uint256 weight,
        EvidenceTier tier,
        AuthMethod authMethod,
        uint256 timestamp,
        address minter,
        uint256 blockNumber,
        EvidenceStatus status,
        string memory metadata,
        uint256 corroborationCount
    ) {
        Evidence storage evidence = evidenceRegistry[_artifactId];
        require(evidence.timestamp > 0, "Evidence not found");
        
        return (
            evidence.contentHash,
            evidence.caseId,
            evidence.weight,
            evidence.tier,
            evidence.authMethod,
            evidence.timestamp,
            evidence.minter,
            evidence.blockNumber,
            evidence.status,
            evidence.metadata,
            evidence.corroborationCount
        );
    }
    
    /**
     * @notice Get all evidence for a case
     * @param _caseId Case identifier
     */
    function getCaseEvidence(string memory _caseId) external view returns (string[] memory) {
        return caseEvidence[_caseId];
    }
    
    /**
     * @notice Get all evidence minted by an address
     * @param _minter Minter address
     */
    function getMinterEvidence(address _minter) external view returns (string[] memory) {
        return minterEvidence[_minter];
    }
    
    /**
     * @notice Check if evidence can be minted
     */
    function _canMint(
        uint256 _weight,
        EvidenceTier _tier,
        AuthMethod _authMethod
    ) private pure returns (bool) {
        // Government tier with digital seal auto-mints
        if (_tier == EvidenceTier.GOVERNMENT && 
            _weight >= GOVERNMENT_THRESHOLD &&
            _authMethod == AuthMethod.DIGITAL_SEAL) {
            return true;
        }
        
        // Financial tier with high weight
        if (_tier == EvidenceTier.FINANCIAL && 
            _weight >= FINANCIAL_THRESHOLD) {
            return true;
        }
        
        // Third party with verification
        if (_tier == EvidenceTier.THIRD_PARTY && 
            _weight >= THIRD_PARTY_THRESHOLD &&
            _authMethod != AuthMethod.NONE) {
            return true;
        }
        
        // Personal evidence cannot auto-mint
        if (_tier == EvidenceTier.PERSONAL) {
            return false;
        }
        
        return false;
    }
    
    /**
     * @notice Check if evidence has enough corroboration
     */
    function _hasEnoughCorroboration(Evidence storage _evidence) private view returns (bool) {
        if (_evidence.tier == EvidenceTier.PERSONAL) {
            return _evidence.corroborationCount >= 3;
        } else if (_evidence.tier == EvidenceTier.THIRD_PARTY) {
            return _evidence.corroborationCount >= 2;
        } else if (_evidence.tier == EvidenceTier.FINANCIAL) {
            return _evidence.corroborationCount >= 1;
        }
        
        return true; // Government tier doesn't need corroboration
    }
    
    /**
     * @notice Get total evidence count
     */
    function getTotalEvidence() external view returns (uint256) {
        return _evidenceCounter.current();
    }
    
    /**
     * @notice Get total contradictions reported
     */
    function getTotalContradictions() external view returns (uint256) {
        return _contradictionCounter.current();
    }
}