# ChittyChain Evidence Ledger - Notion Setup Guide

## Quick Setup Instructions

Create these 7 databases in Notion in this exact order (relationships depend on creation order):

---

## 1. MASTER EVIDENCE DATABASE

**Database Name:** `ChittyChain - Master Evidence`

### Properties to Add:

| Property Name | Type | Configuration |
|---------------|------|---------------|
| **Evidence ID** | Title | Auto-generated |
| **Artifact ID** | Formula | `"ART-" + prop("ID")` |
| **Case Binding** | Relation | → *Cases* database |
| **User Binding** | Relation | → *Users* database |
| **Evidence Type** | Select | Document, Image, Communication, Financial Record, Legal Filing, Physical Evidence |
| **Evidence Tier** | Select | SELF_AUTHENTICATING, GOVERNMENT, FINANCIAL_INSTITUTION, INDEPENDENT_THIRD_PARTY, BUSINESS_RECORDS, FIRST_PARTY_ADVERSE, FIRST_PARTY_FRIENDLY, UNCORROBORATED_PERSON |
| **Evidence Weight** | Number | 0.0 to 1.0 (Formula below) |
| **Content Hash** | Text | SHA-256 hash |
| **Original Filename** | Text | |
| **Upload Date** | Date | |
| **Source Verification Status** | Select | Verified, Pending, Failed |
| **Authentication Method** | Select | Seal, Stamp, Certification, Notarization, Digital Signature, Metadata, Witness, None |
| **Chain of Custody** | Relation | → *Chain of Custody Log* (Allow multiple) |
| **Extracted Facts** | Relation | → *Atomic Facts* (Allow multiple) |
| **Supporting Claims** | Multi-select | Custom tags |
| **Contradicting Claims** | Multi-select | Custom tags |
| **Minting Status** | Select | Minted, Pending, Rejected, Requires Corroboration |
| **Block Number** | Text | |
| **Audit Notes** | Text (Long) | |
| **File Size** | Number | Bytes |
| **IPFS Hash** | Text | |
| **Encryption Status** | Checkbox | |
| **Redaction Level** | Select | None, Partial, Full |

### Formula for Evidence Weight:
```javascript
if(prop("Evidence Tier") == "SELF_AUTHENTICATING", 1,
if(prop("Evidence Tier") == "GOVERNMENT", 0.95,
if(prop("Evidence Tier") == "FINANCIAL_INSTITUTION", 0.9,
if(prop("Evidence Tier") == "INDEPENDENT_THIRD_PARTY", 0.85,
if(prop("Evidence Tier") == "BUSINESS_RECORDS", 0.75,
if(prop("Evidence Tier") == "FIRST_PARTY_ADVERSE", 0.7,
if(prop("Evidence Tier") == "FIRST_PARTY_FRIENDLY", 0.6,
if(prop("Evidence Tier") == "UNCORROBORATED_PERSON", 0.4, 0.5))))))))
```

---

## 2. ATOMIC FACTS DATABASE

**Database Name:** `ChittyChain - Atomic Facts`

### Properties to Add:

| Property Name | Type | Configuration |
|---------------|------|---------------|
| **Fact Statement** | Title | Main fact text |
| **Fact ID** | Formula | `"FACT-" + prop("ID")` |
| **Parent Document** | Relation | → *Master Evidence* |
| **Fact Type** | Select | DATE, AMOUNT, ADMISSION, IDENTITY, LOCATION, RELATIONSHIP, ACTION, STATUS |
| **Location in Document** | Text | "p.12 ¶3 l.4" format |
| **Classification Level** | Select | FACT, SUPPORTED_CLAIM, ASSERTION, ALLEGATION, CONTRADICTION |
| **Weight** | Number | 0.0 to 1.0 |
| **Against Interest** | Checkbox | Credibility factor |
| **Contemporaneous** | Checkbox | Credibility factor |
| **Business Duty** | Checkbox | Credibility factor |
| **Official Duty** | Checkbox | Credibility factor |
| **Related Facts** | Relation | → *Atomic Facts* (Self-relation, allow multiple) |
| **Supports Case Theory** | Multi-select | Custom theory tags |
| **Contradicts Case Theory** | Multi-select | Custom theory tags |
| **ChittyChain Status** | Select | Minted, Pending, Rejected |
| **Verification Date** | Date | |
| **Verification Method** | Text | |
| **Extraction Method** | Select | Manual, GPT-4, Claude, Hybrid |
| **Extraction Confidence** | Number | 0.0 to 1.0 |
| **Extraction Timestamp** | Date & Time | |

---

## 3. CASES DATABASE

**Database Name:** `ChittyChain - Cases`

### Properties to Add:

| Property Name | Type | Configuration |
|---------------|------|---------------|
| **Case Name** | Title | |
| **Case ID** | Formula | `prop("Jurisdiction") + "-" + formatDate(prop("Filing Date"), "YYYY") + "-" + prop("Case Type") + "-" + prop("Case Number")` |
| **Jurisdiction** | Select | ILLINOIS-COOK, ILLINOIS-DUPAGE, etc. |
| **Case Number** | Text | Court docket number |
| **Case Type** | Select | DIVORCE, CUSTODY, CIVIL, CRIMINAL, PROBATE |
| **Filing Date** | Date | |
| **Parties** | Relation | → *Users* (Allow multiple) |
| **Judge Assigned** | Text | |
| **Case Status** | Select | Active, Stayed, Closed, Appeal |
| **Total Evidence Items** | Rollup | Count from *Master Evidence* |
| **Minted Facts Count** | Rollup | Count from *Atomic Facts* where Status = Minted |
| **Average Evidence Weight** | Rollup | Average from *Master Evidence* |
| **Next Hearing Date** | Date | |
| **Estimated Value** | Number | Currency |
| **Priority** | Select | Low, Medium, High, Urgent |
| **Key Dates** | Text (Long) | |

---

## 4. USERS DATABASE

**Database Name:** `ChittyChain - Users`

### Properties to Add:

| Property Name | Type | Configuration |
|---------------|------|---------------|
| **Full Name** | Title | |
| **Registration Number** | Formula | `"REG" + format(prop("ID") * 12345 + 10000000)` |
| **User Type** | Select | PARTY_PETITIONER, PARTY_RESPONDENT, ATTORNEY_PETITIONER, ATTORNEY_RESPONDENT, COURT_OFFICER, EXPERT_WITNESS |
| **Bar Number** | Text | For attorneys |
| **Email** | Email | |
| **Phone** | Phone | |
| **Verified Status** | Checkbox | |
| **Cases** | Relation | → *Cases* (Allow multiple) |
| **Submitted Evidence** | Relation | → *Master Evidence* (Allow multiple) |
| **Trust Score** | Number | 0-100 |
| **Last Activity** | Date | |
| **2FA Enabled** | Checkbox | |
| **Account Locked** | Checkbox | |
| **Login Attempts** | Number | |
| **Password Last Changed** | Date | |

---

## 5. CHAIN OF CUSTODY LOG

**Database Name:** `ChittyChain - Chain of Custody`

### Properties to Add:

| Property Name | Type | Configuration |
|---------------|------|---------------|
| **Log Entry** | Title | Auto-description |
| **Log ID** | Number | Auto-increment |
| **Evidence** | Relation | → *Master Evidence* |
| **Custodian** | Relation | → *Users* |
| **Date Received** | Date & Time | |
| **Date Transferred** | Date & Time | |
| **Transfer Method** | Select | SEALED_ENVELOPE, CERTIFIED_MAIL, SECURE_DIGITAL, COURT_FILING, NOTARY_TRANSFER, DIRECT_HANDOFF |
| **Integrity Check Method** | Select | HASH_VERIFICATION, SEAL_INTACT, WITNESS_CONFIRMATION, METADATA_MATCH |
| **Integrity Verified** | Checkbox | |
| **Location** | Text | Physical location |
| **Temperature** | Text | For sensitive evidence |
| **Witness Signature** | Text | |
| **Digital Signature** | Text | |
| **Notes** | Text (Long) | |

---

## 6. CONTRADICTION TRACKING

**Database Name:** `ChittyChain - Contradictions`

### Properties to Add:

| Property Name | Type | Configuration |
|---------------|------|---------------|
| **Contradiction Summary** | Title | Auto-generated description |
| **Contradiction ID** | Formula | `"CONFLICT-" + prop("ID")` |
| **Conflicting Facts** | Relation | → *Atomic Facts* (Allow multiple) |
| **Conflict Type** | Select | DIRECT_CONTRADICTION, TEMPORAL_IMPOSSIBILITY, LOGICAL_INCONSISTENCY, PARTIAL_CONFLICT |
| **Winning Fact** | Relation | → *Atomic Facts* |
| **Resolution Method** | Select | HIERARCHY_RULE, TEMPORAL_PRIORITY, AUTHENTICATION_SUPERIORITY, ADVERSE_ADMISSION, CONTEMPORANEOUS_RECORD |
| **Resolution Date** | Date | |
| **Severity** | Select | Minor, Moderate, Major, Critical |
| **Impact on Case** | Text (Long) | |
| **Reviewer Notes** | Text (Long) | |
| **Appealable** | Checkbox | |
| **Resolution Confidence** | Number | 0.0 to 1.0 |

---

## 7. AUDIT TRAIL DATABASE

**Database Name:** `ChittyChain - Audit Trail`

### Properties to Add:

| Property Name | Type | Configuration |
|---------------|------|---------------|
| **Action Description** | Title | Auto-generated |
| **Action ID** | Number | Auto-increment |
| **Timestamp** | Created Time | Auto-generated |
| **User** | Relation | → *Users* |
| **Action Type** | Select | Upload, Verify, Mint, Reject, Query, Modify, Access, Delete, Export |
| **Target Artifact** | Relation | → *Master Evidence* |
| **IP Address** | Text | |
| **Session ID** | Text | |
| **Success/Failure** | Select | Success, Failure |
| **Duration (ms)** | Number | |
| **Error Code** | Text | |
| **User Agent** | Text | |
| **Details** | Text (Long) | JSON data |

---

## DATABASE VIEWS TO CREATE

### 1. "Pending Verification" View
- **Filter:** Source Verification Status = "Pending"
- **Sort:** Upload Date (Newest first)
- **Group:** By Case

### 2. "High Weight Evidence" View  
- **Filter:** Evidence Weight ≥ 0.9
- **Sort:** Weight (Highest first)
- **Show:** Artifact ID, Evidence Type, Weight, Minting Status

### 3. "Contradictions Dashboard" View
- **Database:** Contradictions
- **Group:** By Conflict Type
- **Filter:** Resolution Date is empty
- **Sort:** Severity (Critical first)

### 4. "My Submissions" View
- **Filter:** User Binding = @CurrentUser
- **Sort:** Upload Date (Newest first)
- **Show:** Evidence Type, Status, Weight

### 5. "Recently Minted" View
- **Filter:** Minting Status = "Minted"
- **Sort:** Upload Date (Newest first)
- **Show:** Artifact ID, Block Number, Case

### 6. "Case Summary" View
- **Database:** Cases
- **Show:** Total Evidence Items, Minted Facts Count, Average Weight
- **Sort:** Priority, Filing Date

### 7. "Timeline View" View
- **Database:** Atomic Facts
- **Sort:** Extraction Timestamp
- **Group:** By Parent Document
- **Filter:** Verification Date is not empty

### 8. "Audit Log" View
- **Database:** Audit Trail
- **Sort:** Timestamp (Newest first)
- **Filter:** Last 30 days
- **Show:** User, Action Type, Success/Failure

---

## AUTOMATION SETUP

### 1. Status Change Notifications
- **Trigger:** When Source Verification Status changes
- **Action:** Send notification to User Binding

### 2. Auto-Mint Trigger
- **Trigger:** When Evidence Weight ≥ 0.9 AND Status = "Verified"
- **Action:** Update Minting Status to "Minted"

### 3. Contradiction Alert
- **Trigger:** New record in Contradictions database
- **Action:** Send alert to case parties

### 4. High-Priority Case Alert
- **Trigger:** Case Priority = "Urgent"
- **Action:** Daily reminder until status changes

---

## SECURITY & PERMISSIONS

### Database Permissions:
- **Attorneys:** Full access to their cases
- **Parties:** Read-only access to their case evidence
- **Court Officers:** Read access to all, write access to verifications
- **Experts:** Limited to evidence they're assigned to review

### Page Permissions:
- **Evidence pages:** Restrict by Case Binding
- **User pages:** Users can only edit their own profile
- **Audit pages:** Read-only for all users

---

## INTEGRATION NOTES

### API Integration:
- Use Notion API to sync with ChittyChain backend
- Webhook endpoints for real-time updates
- Batch upload for large evidence sets

### Blockchain Integration:
- Content Hash field syncs with IPFS
- Block Number field updated when minted
- Minting Status driven by smart contract events

---

*This setup creates a production-ready evidence management system that meets court admissibility standards while providing intuitive collaboration tools for legal teams.*