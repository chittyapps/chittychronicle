import crypto from 'crypto';
import { ChittyBlockchain } from '../blockchain/index.js';

export class EvidenceIntakeAssistant {
  constructor() {
    this.intakeQueue = [];
    this.processedEvidence = new Map();
    this.evidenceTypes = {
      'document': this.processDocument.bind(this),
      'image': this.processImage.bind(this),
      'communication': this.processCommunication.bind(this),
      'financial_record': this.processFinancialRecord.bind(this),
      'legal_filing': this.processLegalFiling.bind(this)
    };
  }

  async intakeEvidence(submission) {
    // Create intake record
    const intakeRecord = {
      intakeId: this.generateIntakeId(),
      timestamp: new Date().toISOString(),
      submitterId: submission.userId,
      caseId: submission.caseId,
      evidenceType: submission.type,
      status: 'RECEIVED',
      metadata: {},
      validationResults: {},
      extractedClaims: []
    };

    try {
      // Step 1: Basic validation
      const basicValidation = this.validateSubmission(submission);
      if (!basicValidation.valid) {
        intakeRecord.status = 'REJECTED';
        intakeRecord.validationResults = basicValidation;
        return intakeRecord;
      }

      // Step 2: Check spam/rate limits
      const spamCheck = await ChittyBlockchain.validateSubmission({
        userId: submission.userId,
        caseId: submission.caseId,
        content: submission.content
      });
      
      if (!spamCheck.allowed) {
        intakeRecord.status = 'SPAM_BLOCKED';
        intakeRecord.validationResults = spamCheck;
        return intakeRecord;
      }

      // Step 3: Extract metadata
      intakeRecord.metadata = this.extractMetadata(submission);

      // Step 4: Process by type
      const processor = this.evidenceTypes[submission.type];
      if (processor) {
        const processingResult = await processor(submission);
        intakeRecord.extractedClaims = processingResult.claims;
        intakeRecord.validationResults = processingResult.validation;
      }

      // Step 5: Calculate initial weight
      const weight = await ChittyBlockchain.calculateWeight(
        submission.sourceTier,
        submission.credibilityFactors || {}
      );
      intakeRecord.evidenceWeight = weight;

      // Step 6: Generate receipt
      intakeRecord.receipt = this.generateIntakeReceipt(intakeRecord);
      intakeRecord.status = 'PROCESSED';

      // Store processed evidence
      this.processedEvidence.set(intakeRecord.intakeId, intakeRecord);

      return intakeRecord;

    } catch (error) {
      intakeRecord.status = 'ERROR';
      intakeRecord.error = error.message;
      return intakeRecord;
    }
  }

  validateSubmission(submission) {
    const errors = [];

    // Required fields
    if (!submission.userId) errors.push('Missing user ID');
    if (!submission.caseId) errors.push('Missing case ID');
    if (!submission.type) errors.push('Missing evidence type');
    if (!submission.content && !submission.file) errors.push('Missing content');
    
    // Valid evidence type
    if (!this.evidenceTypes[submission.type]) {
      errors.push(`Invalid evidence type: ${submission.type}`);
    }

    // Case format validation
    if (submission.caseId && !this.isValidCaseNumber(submission.caseId)) {
      errors.push('Invalid case number format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  extractMetadata(submission) {
    const metadata = {
      submissionTime: new Date().toISOString(),
      fileInfo: {},
      contentInfo: {},
      sourceInfo: {}
    };

    if (submission.file) {
      metadata.fileInfo = {
        name: submission.file.name,
        size: submission.file.size,
        type: submission.file.mimetype,
        hash: this.calculateFileHash(submission.file)
      };
    }

    if (submission.content) {
      metadata.contentInfo = {
        length: submission.content.length,
        hash: crypto.createHash('sha256').update(submission.content).digest('hex'),
        preview: submission.content.substring(0, 200)
      };
    }

    metadata.sourceInfo = {
      tier: submission.sourceTier || 'UNCORROBORATED_PERSON',
      description: submission.sourceDescription,
      verificationMethod: submission.verificationMethod
    };

    return metadata;
  }

  async processDocument(submission) {
    const claims = [];
    const validation = { checks: {}, score: 0 };

    // Extract text content
    let textContent = submission.content;
    if (submission.file && submission.file.mimetype === 'application/pdf') {
      // In production, use pdf-parse to extract text
      textContent = await this.extractPDFText(submission.file);
    }

    // Parse claims from document
    const extractedClaims = this.extractClaimsFromText(textContent);
    
    for (const claim of extractedClaims) {
      claims.push({
        id: crypto.randomUUID(),
        text: claim.text,
        type: claim.type,
        location: claim.location,
        verifiable: claim.verifiable,
        category: this.categorizeClaim(claim)
      });
    }

    // Document-specific validation
    validation.checks.hasDate = this.extractDates(textContent).length > 0;
    validation.checks.hasSignature = textContent.includes('Signed:') || textContent.includes('/s/');
    validation.checks.properFormat = this.checkDocumentFormat(textContent);
    
    validation.score = Object.values(validation.checks).filter(v => v).length / 
                      Object.keys(validation.checks).length;

    return { claims, validation };
  }

  async processImage(submission) {
    const claims = [];
    const validation = { checks: {}, score: 0 };

    // Image forensics checks
    validation.checks.metadataPresent = submission.metadata?.exif !== undefined;
    validation.checks.notEdited = !submission.metadata?.edited;
    validation.checks.timestampValid = this.validateImageTimestamp(submission.metadata);
    validation.checks.locationValid = this.validateImageLocation(submission.metadata);

    // Extract claims from image context
    if (submission.description) {
      const imageClaims = this.extractClaimsFromText(submission.description);
      claims.push(...imageClaims.map(claim => ({
        ...claim,
        evidenceType: 'IMAGE',
        imageHash: submission.file?.hash
      })));
    }

    validation.score = Object.values(validation.checks).filter(v => v).length / 
                      Object.keys(validation.checks).length;

    return { claims, validation };
  }

  async processCommunication(submission) {
    const claims = [];
    const validation = { checks: {}, score: 0 };

    // Parse communication content
    const messages = this.parseMessageThread(submission.content);
    
    for (const message of messages) {
      const messageClaims = this.extractClaimsFromText(message.content);
      claims.push(...messageClaims.map(claim => ({
        ...claim,
        sender: message.sender,
        timestamp: message.timestamp,
        againstInterest: this.isAgainstInterest(message, submission.userId)
      })));
    }

    // Communication-specific validation
    validation.checks.hasTimestamps = messages.every(m => m.timestamp);
    validation.checks.hasSenders = messages.every(m => m.sender);
    validation.checks.threadIntegrity = this.checkThreadIntegrity(messages);
    
    validation.score = Object.values(validation.checks).filter(v => v).length / 
                      Object.keys(validation.checks).length;

    return { claims, validation };
  }

  async processFinancialRecord(submission) {
    const claims = [];
    const validation = { checks: {}, score: 0 };

    // Extract financial data points
    const transactions = this.extractTransactions(submission.content);
    const accountInfo = this.extractAccountInfo(submission.content);

    // Convert to claims
    for (const transaction of transactions) {
      claims.push({
        id: crypto.randomUUID(),
        text: `Transaction: ${transaction.amount} on ${transaction.date}`,
        type: 'FINANCIAL_TRANSACTION',
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description,
        verifiable: true,
        weight: 0.85 // Financial records have high base weight
      });
    }

    // Add account-level claims
    if (accountInfo.accountHolder) {
      claims.push({
        id: crypto.randomUUID(),
        text: `Account holder: ${accountInfo.accountHolder}`,
        type: 'IDENTITY',
        verifiable: true,
        weight: 0.85
      });
    }

    // Financial record validation
    validation.checks.hasAccountNumber = !!accountInfo.accountNumber;
    validation.checks.hasInstitutionName = !!accountInfo.institution;
    validation.checks.hasDateRange = !!accountInfo.statementPeriod;
    validation.checks.balancesReconcile = this.checkBalanceReconciliation(transactions);
    
    validation.score = Object.values(validation.checks).filter(v => v).length / 
                      Object.keys(validation.checks).length;

    return { claims, validation };
  }

  async processLegalFiling(submission) {
    const claims = [];
    const validation = { checks: {}, score: 0 };

    // Parse legal document structure
    const sections = this.parseLegalDocument(submission.content);
    
    for (const section of sections) {
      const sectionClaims = this.extractLegalClaims(section);
      claims.push(...sectionClaims.map(claim => ({
        ...claim,
        section: section.title,
        paragraph: section.number,
        legalContext: true
      })));
    }

    // Legal filing validation
    validation.checks.hasCaseNumber = submission.content.includes('Case No');
    validation.checks.hasParties = submission.content.includes('Petitioner') || 
                                  submission.content.includes('Plaintiff');
    validation.checks.hasCourt = submission.content.includes('Court');
    validation.checks.properFormat = this.checkLegalFormat(submission.content);
    
    validation.score = Object.values(validation.checks).filter(v => v).length / 
                      Object.keys(validation.checks).length;

    return { claims, validation };
  }

  extractClaimsFromText(text) {
    const claims = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

    for (const sentence of sentences) {
      const claim = this.analyzeSentence(sentence.trim());
      if (claim && claim.type !== 'NOISE') {
        claims.push(claim);
      }
    }

    return claims;
  }

  analyzeSentence(sentence) {
    // Skip non-factual sentences
    if (this.isLegalBoilerplate(sentence)) return null;
    if (this.isPureOpinion(sentence)) return { type: 'OPINION', text: sentence };

    // Identify claim type
    const claimTypes = {
      DATE: /\b(January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/i,
      AMOUNT: /\$[\d,]+\.?\d*/,
      IDENTITY: /\b(Petitioner|Respondent|Plaintiff|Defendant)\b/i,
      ACTION: /\b(transferred|formed|married|separated|filed)\b/i,
      OWNERSHIP: /\b(owns|owned|owner of|holds title)\b/i,
      LOCATION: /\b\d+\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/i
    };

    let type = 'GENERAL';
    let verifiable = false;

    for (const [claimType, pattern] of Object.entries(claimTypes)) {
      if (pattern.test(sentence)) {
        type = claimType;
        verifiable = ['DATE', 'AMOUNT', 'IDENTITY', 'LOCATION'].includes(claimType);
        break;
      }
    }

    return {
      text: sentence,
      type,
      verifiable,
      location: { start: 0, end: sentence.length }
    };
  }

  categorizeClaim(claim) {
    const categories = {
      FINANCIAL: /\$|dollar|payment|transfer|deposit|account/i,
      TEMPORAL: /date|time|when|month|year|day/i,
      PROPERTY: /property|real estate|house|land|building/i,
      RELATIONSHIP: /married|spouse|husband|wife|partner/i,
      BUSINESS: /LLC|company|corporation|business/i,
      LEGAL: /court|filed|petition|motion|order/i
    };

    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(claim.text)) {
        return category;
      }
    }

    return 'GENERAL';
  }

  generateIntakeId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `INT-${timestamp}-${random}`.toUpperCase();
  }

  generateIntakeReceipt(record) {
    return {
      receiptId: crypto.randomUUID(),
      intakeId: record.intakeId,
      timestamp: record.timestamp,
      submitter: record.submitterId,
      case: record.caseId,
      type: record.evidenceType,
      status: record.status,
      claimCount: record.extractedClaims.length,
      weight: record.evidenceWeight,
      hash: crypto.createHash('sha256')
        .update(JSON.stringify(record))
        .digest('hex')
    };
  }

  // Helper methods
  isValidCaseNumber(caseNumber) {
    return /^[A-Z]+-\d{4}-[A-Z]-\d{6}$/.test(caseNumber);
  }

  calculateFileHash(file) {
    // In production, read file buffer and hash
    return crypto.randomBytes(32).toString('hex');
  }

  extractDates(text) {
    const datePattern = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi;
    return text.match(datePattern) || [];
  }

  extractTransactions(content) {
    // Simplified transaction extraction
    const transactions = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+\$?([\d,]+\.?\d*)/);
      if (match) {
        transactions.push({
          date: match[1],
          description: match[2].trim(),
          amount: parseFloat(match[3].replace(/,/g, ''))
        });
      }
    }
    
    return transactions;
  }

  extractAccountInfo(content) {
    return {
      accountNumber: (content.match(/Account.*?(\d{4,})/) || [])[1],
      accountHolder: (content.match(/Account Holder:?\s*(.+)/) || [])[1],
      institution: (content.match(/Bank:|Financial Institution:?\s*(.+)/) || [])[1],
      statementPeriod: (content.match(/Statement Period:?\s*(.+)/) || [])[1]
    };
  }

  parseMessageThread(content) {
    // Simple message parsing
    const messages = [];
    const messageBlocks = content.split(/\n\n/);
    
    for (const block of messageBlocks) {
      const sender = (block.match(/From:?\s*(.+)/) || [])[1];
      const timestamp = (block.match(/Date:?\s*(.+)/) || [])[1];
      const messageContent = block.replace(/From:.*\n|Date:.*\n/g, '').trim();
      
      if (sender && messageContent) {
        messages.push({ sender, timestamp, content: messageContent });
      }
    }
    
    return messages;
  }

  parseLegalDocument(content) {
    const sections = [];
    const sectionPattern = /^\s*(\d+\.|\([a-z]\)|\w+\.)\s+(.+)/gm;
    let match;
    
    while ((match = sectionPattern.exec(content)) !== null) {
      sections.push({
        number: match[1],
        title: match[2],
        content: '' // Would extract until next section
      });
    }
    
    return sections;
  }

  extractLegalClaims(section) {
    const claims = this.extractClaimsFromText(section.content || section.title);
    return claims.map(claim => ({
      ...claim,
      legalWeight: this.assessLegalWeight(claim)
    }));
  }

  assessLegalWeight(claim) {
    if (claim.text.includes('upon information and belief')) return 0.3;
    if (claim.text.includes('alleges')) return 0.4;
    if (claim.text.includes('undisputed')) return 0.8;
    if (claim.text.includes('stipulated')) return 0.9;
    return 0.5;
  }

  isAgainstInterest(message, userId) {
    // Check if message is against the sender's interest
    return message.sender === userId && 
           (message.content.includes('I owe') || 
            message.content.includes('my fault') ||
            message.content.includes('I admit'));
  }

  checkDocumentFormat(text) {
    // Basic format checks
    const hasStructure = /^\s*\d+\./m.test(text);
    const hasSignature = /Signed:|\/s\/|Signature/i.test(text);
    const hasDate = this.extractDates(text).length > 0;
    
    return hasStructure || (hasSignature && hasDate);
  }

  checkLegalFormat(text) {
    const requiredElements = [
      /Case No\.?:?\s*[\w-]+/i,
      /Court/i,
      /(Plaintiff|Petitioner)/i,
      /(Defendant|Respondent)/i
    ];
    
    return requiredElements.filter(pattern => pattern.test(text)).length >= 3;
  }

  checkThreadIntegrity(messages) {
    // Check if messages form coherent thread
    if (messages.length < 2) return true;
    
    // Check chronological order
    for (let i = 1; i < messages.length; i++) {
      const prevTime = new Date(messages[i-1].timestamp);
      const currTime = new Date(messages[i].timestamp);
      if (currTime < prevTime) return false;
    }
    
    return true;
  }

  checkBalanceReconciliation(transactions) {
    // In production, would verify running balances
    return transactions.length > 0;
  }

  validateImageTimestamp(metadata) {
    if (!metadata?.timestamp) return false;
    const imageDate = new Date(metadata.timestamp);
    return imageDate <= new Date();
  }

  validateImageLocation(metadata) {
    if (!metadata?.gps) return true; // No GPS is okay
    // Check if GPS coordinates are valid
    const lat = metadata.gps.latitude;
    const lon = metadata.gps.longitude;
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  isLegalBoilerplate(sentence) {
    const boilerplate = [
      /NOW COMES/i,
      /WHEREFORE/i,
      /pursuant to/i,
      /incorporated by reference/i,
      /respectfully submitted/i
    ];
    
    return boilerplate.some(pattern => pattern.test(sentence));
  }

  isPureOpinion(sentence) {
    const opinionMarkers = [
      /I believe/i,
      /I think/i,
      /In my opinion/i,
      /seems to be/i,
      /appears to be/i
    ];
    
    return opinionMarkers.some(pattern => pattern.test(sentence));
  }

  extractPDFText(file) {
    // Mock PDF text extraction
    return "Sample PDF content for testing";
  }
}