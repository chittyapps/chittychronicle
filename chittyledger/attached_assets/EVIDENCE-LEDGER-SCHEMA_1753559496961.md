# ChittyChain Evidence Ledger Schema

## Overview
A blockchain-inspired evidence management system for legal proceedings with immutable chain of custody tracking and contradiction resolution.

## Data Types (7 Tables)

### 1. MASTER EVIDENCE
**Purpose:** Canonical registry of every artifact
| Property | Type | Description |
|----------|------|-------------|
| Artifact ID | Formula | "ART-" + toText(id()) |
| Case Binding | Relation | → CASES (1) |
| User Binding | Relation | → USERS (1) |
| Evidence Type | Select | Document, Image, Communication, Financial Record, Legal Filing, Physical Evidence |
| Evidence Tier | Select | SELF_AUTHENTICATING, GOVERNMENT, FINANCIAL_INSTITUTION, INDEPENDENT_THIRD_PARTY, BUSINESS_RECORDS, FIRST_PARTY_ADVERSE, FIRST_PARTY_FRIENDLY, UNCORROBORATED_PERSON |
| Evidence Weight | Number | 0.0-1.0 (auto via Formula) |
| Content Hash | Text | SHA-256 |
| Original Filename | Text | - |
| Upload Date | Date | - |
| Source Verification Status | Select | Verified, Pending, Failed |
| Authentication Method | Select | Seal, Stamp, Certification, Notarization, Digital Signature, Metadata, Witness, None |
| Chain of Custody | Relation | → CHAIN OF CUSTODY LOG (many) |
| Extracted Facts | Relation | → ATOMIC FACTS (many) |
| Supporting Claims | Multi-select | - |
| Contradicting Claims | Multi-select | - |
| Minting Status | Select | Minted, Pending, Rejected, Requires Corroboration |
| Block Number | Text | - |
| Audit Notes | Long text | - |

### 2. ATOMIC FACTS
**Purpose:** Line-item facts extracted from evidence
| Property | Type | Description |
|----------|------|-------------|
| Fact ID | Formula | "FACT-" + toText(id()) |
| Parent Document | Relation | → MASTER EVIDENCE (1) |
| Fact Text | Long text | - |
| Fact Type | Select | DATE, AMOUNT, ADMISSION, IDENTITY, LOCATION, RELATIONSHIP, ACTION, STATUS |
| Location in Document | Text | p./¶/l. |
| Classification Level | Select | FACT, SUPPORTED_CLAIM, ASSERTION, ALLEGATION, CONTRADICTION |
| Weight | Number | 0.0-1.0 |
| Credibility Factors | Checkbox | Against Interest, Contemporaneous, Business Duty, Official Duty |
| Related Facts | Self-relation | (many) |
| Supports Case Theory | Multi-select | - |
| Contradicts Case Theory | Multi-select | - |
| ChittyChain Status | Select | Minted, Pending, Rejected |
| Verification Date | Date | - |
| Verification Method | Text | - |

### 3. CASES
**Purpose:** Matter-level container with roll-ups & deadlines
| Property | Type | Description |
|----------|------|-------------|
| Case ID | Formula | Jurisdiction + "-" + Year(Date) + "-" + Case Type + "-" + Case Number |
| Jurisdiction | Select | e.g., ILLINOIS-COOK |
| Case Number | Text | - |
| Case Type | Select | DIVORCE, CUSTODY, CIVIL, CRIMINAL, PROBATE |
| Filing Date | Date | - |
| Parties | Relation | → USERS (many) |
| Judge Assigned | Text | - |
| Case Status | Select | Active, Stayed, Closed, Appeal |
| Total Evidence Items | Roll-up | count MASTER EVIDENCE |
| Minted Facts Count | Roll-up | count ATOMIC FACTS where ChittyChain Status = Minted |
| Key Dates | Rich text/table | - |

### 4. USERS
**Purpose:** Parties, counsel, experts, court officers
| Property | Type | Description |
|----------|------|-------------|
| Registration Number | Text | "REG" + lpad(random(1,99999999),8,'0') |
| User Type | Select | PARTY_PETITIONER, PARTY_RESPONDENT, ATTORNEY_PETITIONER, ATTORNEY_RESPONDENT, COURT_OFFICER, EXPERT_WITNESS |
| Full Name | Text | - |
| Bar Number | Text | - |
| Email | Email | - |
| Phone | Phone | - |
| Verified Status | Checkbox | - |
| Cases | Relation | → CASES (many) |
| Submitted Evidence | Relation | → MASTER EVIDENCE (many) |
| Trust Score | Number | 0-100 |
| Last Activity | Date | - |
| 2FA Enabled | Checkbox | - |

### 5. CHAIN OF CUSTODY LOG
**Purpose:** Immutable hand-off entries
| Property | Type | Description |
|----------|------|-------------|
| Log ID | Auto-number | - |
| Evidence | Relation | → MASTER EVIDENCE (1) |
| Custodian | Relation | → USERS (1) |
| Date Received | Date & time | - |
| Date Transferred | Date & time | - |
| Transfer Method | Select | SEALED_ENVELOPE, CERTIFIED_MAIL, SECURE_DIGITAL, COURT_FILING, NOTARY_TRANSFER, DIRECT_HANDOFF |
| Integrity Check Method | Select | HASH_VERIFICATION, SEAL_INTACT, WITNESS_CONFIRMATION, METADATA_MATCH |
| Integrity Verified | Checkbox | - |
| Notes | Long text | - |

### 6. CONTRADICTION TRACKING
**Purpose:** Conflicting-fact resolution engine
| Property | Type | Description |
|----------|------|-------------|
| Contradiction ID | Formula | "CONFLICT-" + toText(id()) |
| Conflicting Facts | Relation | → ATOMIC FACTS (many) |
| Conflict Type | Select | DIRECT_CONTRADICTION, TEMPORAL_IMPOSSIBILITY, LOGICAL_INCONSISTENCY, PARTIAL_CONFLICT |
| Winning Fact | Relation | → ATOMIC FACTS (1) |
| Resolution Method | Select | HIERARCHY_RULE, TEMPORAL_PRIORITY, AUTHENTICATION_SUPERIORITY, ADVERSE_ADMISSION, CONTEMPORANEOUS_RECORD |
| Resolution Date | Date | - |
| Impact on Case | Long text | - |

### 7. AUDIT TRAIL
**Purpose:** Every CRUD/read against the system
| Property | Type | Description |
|----------|------|-------------|
| Action ID | Auto-number | - |
| Timestamp | Created time | - |
| User | Relation | → USERS (1) |
| Action Type | Select | Upload, Verify, Mint, Reject, Query, Modify, Access |
| Target Artifact | Relation | → MASTER EVIDENCE (1) |
| IP Address | Text | - |
| Session ID | Text | - |
| Success/Failure | Select | Success, Failure |
| Details | Long text | - |

## Views & Dashboards

| View Name | Data Type | Filter/Grouping |
|-----------|-----------|-----------------|
| Pending Verification | MASTER EVIDENCE | Source Verification Status = "Pending" |
| High Weight Evidence | MASTER EVIDENCE | Evidence Weight ≥ 0.9 |
| Contradictions Dashboard | CONTRADICTION TRACKING | Group by Conflict Type |
| My Submissions | MASTER EVIDENCE | User Binding = currentUser() |
| Recently Minted | MASTER EVIDENCE | Minting Status = "Minted", sorted by Verification Date DESC |
| Case Summary | CASES | Group by Case ID |
| Timeline View | ATOMIC FACTS | Timeline by parsed date |
| Audit Log | AUDIT TRAIL | Sorted by Timestamp DESC |

## Page Templates

1. **Evidence Item Detail** - Single MASTER EVIDENCE record with linked facts & custody chain
2. **Case Dashboard** - High-level view with parties, key dates, roll-ups, and evidence heat-map
3. **Fact Verification Sheet** - Checklist for ATOMIC FACTS flagged for manual review
4. **Contradiction Resolver** - CONTRADICTION TRACKING view with resolution workflow
5. **Audit Center** - Read-only AUDIT TRAIL dashboard with export functionality

## Evidence Tier Weighting System

| Tier | Weight | Description | Examples |
|------|--------|-------------|----------|
| SELF_AUTHENTICATING | 1.0 | Official seals, certified records | Court orders, certified death certificates |
| GOVERNMENT | 0.9 | Government agency documents | Police reports, tax records, DMV records |
| FINANCIAL_INSTITUTION | 0.85 | Bank and financial records | Bank statements, loan documents, credit reports |
| INDEPENDENT_THIRD_PARTY | 0.8 | Neutral witness statements | Medical records, expert testimony |
| BUSINESS_RECORDS | 0.7 | Corporate documentation | Employment records, business contracts |
| FIRST_PARTY_ADVERSE | 0.6 | Opposing party admissions | Defendant's statements, adverse party emails |
| FIRST_PARTY_FRIENDLY | 0.4 | Supporting party statements | Plaintiff's testimony, friendly witness statements |
| UNCORROBORATED_PERSON | 0.2 | Unverified individual claims | Anonymous tips, unsworn statements |

## Key Features

- **Blockchain Integration**: Evidence minting with block numbers
- **Evidence Hierarchy**: Tier-based weighting system (8 tiers)
- **Contradiction Resolution**: Automated conflict detection and resolution tracking
- **Chain of Custody**: Complete transfer history with integrity verification
- **Audit Trail**: Full CRUD operation logging
- **Multi-party Access**: Role-based access for parties, attorneys, and court officers

## Technical Implementation Notes

### Database Technology
- **PostgreSQL** via Neon Database (cloud-hosted)
- **Drizzle ORM** for schema management and type-safe queries
- **Migration-free development** using `drizzle-kit push`

### Integration Points
- **ChittyChain MCP Server**: Evidence minting and blockchain operations
- **ChittyCounsel**: Legal workflow automation
- **Mercury/Wave APIs**: Financial evidence validation
- **OpenAI API**: Automated fact extraction and contradiction detection

### Security Considerations
- **SHA-256 content hashing** for tamper detection
- **Role-based access control** for multi-party legal proceedings
- **Immutable audit trail** for litigation hold compliance
- **Chain of custody integrity** verification at each transfer

### No-Code Platform Compatibility
- Suitable for: Notion, Airtable, Monday.com
- Formulas use standard functions (text concatenation, counting, date parsing)
- Relations ensure data integrity across tables
- Roll-ups provide real-time case statistics
- Select fields enforce data consistency

## Legal Compliance Framework

### Federal Rules of Evidence Alignment
- **FRE 901**: Authentication requirements mapped to Evidence Tier system
- **FRE 902**: Self-authenticating documents (Tier 1.0 weighting)
- **FRE 1006**: Summary of voluminous records via Atomic Facts extraction

### Chain of Custody Requirements
- **Continuous custody tracking** from creation to court presentation
- **Integrity verification** at each transfer point
- **Tamper-evident** hash validation system

### Contradiction Resolution Framework
- **Hierarchical resolution** based on evidence tier weighting
- **Temporal analysis** for chronological impossibilities
- **Authentication superiority** rules for conflicting sources
- **Adverse admission** priority (statements against interest)

## Future Enhancement Roadmap

1. **AI-Powered Fact Extraction**: Automated document analysis with OpenAI
2. **Real-time Collaboration**: Multi-party evidence review and annotation
3. **Court Integration**: Direct filing capabilities with e-court systems
4. **Mobile Evidence Collection**: Chain of custody for field-collected evidence
5. **Advanced Analytics**: Case outcome prediction based on evidence patterns

---

*Created: 2025-07-15*  
*Version: 1.0*  
*Author: ChittyOS Legal Technology Suite*