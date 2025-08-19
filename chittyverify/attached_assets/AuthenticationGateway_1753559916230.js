import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export class AuthenticationGateway {
  constructor() {
    this.registeredUsers = new Map();
    this.activeSessions = new Map();
    this.verificationAPIs = {
      barAssociation: this.mockBarAPI.bind(this),
      courtDatabase: this.mockCourtAPI.bind(this),
      identityVerification: this.mockIdentityAPI.bind(this)
    };
    this.JWT_SECRET = process.env.JWT_SECRET || 'chittychain-secret-key';
  }

  async registerUser(registrationData) {
    const {
      fullName,
      email,
      role,
      barNumber,
      caseNumbers,
      identityDocs,
      biometricHash
    } = registrationData;

    // Step 1: Verify identity
    const identityVerified = await this.verifyIdentity(identityDocs);
    if (!identityVerified.valid) {
      return {
        success: false,
        error: 'Identity verification failed',
        details: identityVerified.errors
      };
    }

    // Step 2: Verify professional credentials
    if (role.includes('ATTORNEY')) {
      const barVerified = await this.verifyBarCredentials(barNumber, fullName);
      if (!barVerified.valid) {
        return {
          success: false,
          error: 'Bar credentials invalid',
          details: barVerified.errors
        };
      }
    }

    // Step 3: Verify case association
    const caseAccess = await this.verifyCaseAccess(caseNumbers, fullName, role);
    if (!caseAccess.valid) {
      return {
        success: false,
        error: 'Not authorized for specified cases',
        details: caseAccess.errors
      };
    }

    // Step 4: Generate unique registration number
    const regNumber = this.generateRegistrationNumber();

    // Step 5: Create user profile
    const userProfile = {
      regNumber,
      fullName,
      email,
      role,
      barNumber,
      authorizedCases: caseNumbers,
      biometricHash,
      registeredAt: new Date().toISOString(),
      trustScore: 100, // Starting trust score
      status: 'ACTIVE',
      securityLevel: this.determineSecurityLevel(role),
      passwordHash: await bcrypt.hash(registrationData.password, 10)
    };

    // Store user
    this.registeredUsers.set(regNumber, userProfile);

    // Generate initial session token
    const sessionToken = this.generateSessionToken(userProfile);

    return {
      success: true,
      regNumber,
      sessionToken,
      profile: {
        regNumber,
        fullName,
        role,
        authorizedCases: caseNumbers,
        securityLevel: userProfile.securityLevel
      }
    };
  }

  async authenticateUser(credentials) {
    const { regNumber, password, twoFactorCode, biometricData } = credentials;

    // Get user profile
    const user = this.registeredUsers.get(regNumber);
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      return {
        success: false,
        error: `Account ${user.status}`,
        details: 'Contact administrator'
      };
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      this.logFailedAttempt(regNumber);
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    // Verify 2FA if required
    if (user.securityLevel >= 2) {
      const twoFactorValid = this.verify2FA(regNumber, twoFactorCode);
      if (!twoFactorValid) {
        return {
          success: false,
          error: 'Invalid 2FA code'
        };
      }
    }

    // Verify biometric if provided
    if (biometricData && user.biometricHash) {
      const biometricValid = this.verifyBiometric(biometricData, user.biometricHash);
      if (!biometricValid) {
        return {
          success: false,
          error: 'Biometric verification failed'
        };
      }
    }

    // Create session
    const session = {
      sessionId: crypto.randomUUID(),
      regNumber,
      startTime: Date.now(),
      lastActivity: Date.now(),
      ipAddress: credentials.ipAddress,
      deviceFingerprint: credentials.deviceFingerprint
    };

    this.activeSessions.set(session.sessionId, session);

    // Generate JWT token
    const token = this.generateSessionToken(user);

    return {
      success: true,
      sessionToken: token,
      session: {
        sessionId: session.sessionId,
        expiresIn: '24h'
      },
      user: {
        regNumber: user.regNumber,
        fullName: user.fullName,
        role: user.role,
        authorizedCases: user.authorizedCases
      }
    };
  }

  async verifySession(sessionToken) {
    try {
      const decoded = jwt.verify(sessionToken, this.JWT_SECRET);
      const user = this.registeredUsers.get(decoded.regNumber);
      
      if (!user || user.status !== 'ACTIVE') {
        return { valid: false };
      }

      return {
        valid: true,
        user: {
          regNumber: user.regNumber,
          fullName: user.fullName,
          role: user.role,
          authorizedCases: user.authorizedCases,
          securityLevel: user.securityLevel
        }
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  checkCaseAccess(regNumber, caseId) {
    const user = this.registeredUsers.get(regNumber);
    if (!user) return false;

    return user.authorizedCases.includes(caseId);
  }

  generateRegistrationNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `REG${timestamp}${random}`.substring(0, 11);
  }

  generateSessionToken(user) {
    return jwt.sign(
      {
        regNumber: user.regNumber,
        role: user.role,
        securityLevel: user.securityLevel
      },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  determineSecurityLevel(role) {
    const levels = {
      'COURT_OFFICER': 3,
      'ATTORNEY_OF_RECORD': 2,
      'PARTY_TO_CASE': 2,
      'EXPERT_WITNESS': 1,
      'AUTHORIZED_THIRD_PARTY': 1
    };
    return levels[role] || 1;
  }

  verify2FA(regNumber, code) {
    // In production, implement TOTP/SMS verification
    return code === '123456'; // Mock for testing
  }

  verifyBiometric(providedData, storedHash) {
    // In production, implement proper biometric comparison
    const providedHash = crypto.createHash('sha256').update(providedData).digest('hex');
    return providedHash === storedHash;
  }

  logFailedAttempt(regNumber) {
    // Track failed attempts for security
    const user = this.registeredUsers.get(regNumber);
    if (user) {
      user.failedAttempts = (user.failedAttempts || 0) + 1;
      if (user.failedAttempts >= 5) {
        user.status = 'LOCKED';
      }
    }
  }

  // Mock API integrations
  async mockBarAPI(barNumber, name) {
    // Simulate state bar verification
    return {
      valid: barNumber && barNumber.length > 4,
      attorneyName: name,
      status: 'ACTIVE',
      admissionDate: '2015-06-15'
    };
  }

  async mockCourtAPI(caseNumbers, name, role) {
    // Simulate court database check
    return {
      valid: true,
      cases: caseNumbers.map(caseNum => ({
        caseNumber: caseNum,
        parties: [name],
        role: role,
        status: 'ACTIVE'
      }))
    };
  }

  async mockIdentityAPI(identityDocs) {
    // Simulate identity verification
    return {
      valid: true,
      confidence: 0.95,
      documentType: 'DRIVERS_LICENSE',
      matchScore: 0.98
    };
  }

  async verifyIdentity(docs) {
    const result = await this.verificationAPIs.identityVerification(docs);
    return {
      valid: result.confidence > 0.9,
      errors: result.confidence <= 0.9 ? ['Low confidence score'] : []
    };
  }

  async verifyBarCredentials(barNumber, name) {
    const result = await this.verificationAPIs.barAssociation(barNumber, name);
    return {
      valid: result.valid && result.status === 'ACTIVE',
      errors: !result.valid ? ['Bar number not found'] : []
    };
  }

  async verifyCaseAccess(caseNumbers, name, role) {
    const result = await this.verificationAPIs.courtDatabase(caseNumbers, name, role);
    return {
      valid: result.valid,
      errors: !result.valid ? ['Not authorized for specified cases'] : []
    };
  }

  // Session management
  terminateSession(sessionId) {
    return this.activeSessions.delete(sessionId);
  }

  getActiveSessionCount(regNumber) {
    let count = 0;
    for (const session of this.activeSessions.values()) {
      if (session.regNumber === regNumber) count++;
    }
    return count;
  }

  // Security monitoring
  getSecurityMetrics() {
    const metrics = {
      totalUsers: this.registeredUsers.size,
      activeUsers: 0,
      lockedUsers: 0,
      activeSessions: this.activeSessions.size,
      securityEvents: []
    };

    for (const user of this.registeredUsers.values()) {
      if (user.status === 'ACTIVE') metrics.activeUsers++;
      if (user.status === 'LOCKED') metrics.lockedUsers++;
      if (user.failedAttempts > 0) {
        metrics.securityEvents.push({
          regNumber: user.regNumber,
          failedAttempts: user.failedAttempts,
          status: user.status
        });
      }
    }

    return metrics;
  }
}