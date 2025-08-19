/**
 * Authentication Gateway - Legal Identity Verification System
 * Integrates with the attached comprehensive authentication system
 */

import { User, UserType } from '../../../../shared/types';

export interface RegistrationData {
  fullName: string;
  email: string;
  role: UserType;
  barNumber?: string;
  caseNumbers?: string[];
  identityDocs?: any;
  biometricHash?: string;
  password: string;
}

export interface AuthenticationCredentials {
  regNumber?: string;
  email?: string;
  password: string;
  twoFactorCode?: string;
  biometricData?: any;
}

export interface AuthenticationResult {
  success: boolean;
  regNumber?: string;
  sessionToken?: string;
  profile?: any;
  error?: string;
  details?: any;
}

export class AuthenticationGateway {
  private registeredUsers = new Map<string, any>();
  private activeSessions = new Map<string, any>();
  private JWT_SECRET = 'chittychain-evidence-ledger-secret';

  constructor() {
    // Initialize with some demo users for development
    this.initializeDemoUsers();
  }

  private initializeDemoUsers() {
    const demoUser = {
      regNumber: 'REG00000001',
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      role: UserType.ATTORNEY_PETITIONER,
      barNumber: 'IL12345',
      authorizedCases: ['case-1'],
      registeredAt: new Date().toISOString(),
      trustScore: 85,
      status: 'ACTIVE',
      securityLevel: 2,
      passwordHash: 'hashed_password_demo' // In real app, this would be properly hashed
    };

    this.registeredUsers.set(demoUser.regNumber, demoUser);
  }

  async registerUser(registrationData: RegistrationData): Promise<AuthenticationResult> {
    try {
      // Generate registration number
      const regNumber = this.generateRegistrationNumber();

      // In a real implementation, this would verify credentials
      const userProfile = {
        regNumber,
        fullName: registrationData.fullName,
        email: registrationData.email,
        role: registrationData.role,
        barNumber: registrationData.barNumber,
        authorizedCases: registrationData.caseNumbers || [],
        registeredAt: new Date().toISOString(),
        trustScore: 100,
        status: 'ACTIVE',
        securityLevel: this.determineSecurityLevel(registrationData.role),
        passwordHash: `hashed_${registrationData.password}` // Simplified for demo
      };

      this.registeredUsers.set(regNumber, userProfile);

      const sessionToken = this.generateSessionToken(userProfile);

      return {
        success: true,
        regNumber,
        sessionToken,
        profile: {
          regNumber,
          fullName: userProfile.fullName,
          role: userProfile.role,
          authorizedCases: userProfile.authorizedCases,
          securityLevel: userProfile.securityLevel
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Registration failed',
        details: error.message
      };
    }
  }

  async authenticateUser(credentials: AuthenticationCredentials): Promise<AuthenticationResult> {
    try {
      let user: any = null;

      // Find user by registration number or email
      if (credentials.regNumber) {
        user = this.registeredUsers.get(credentials.regNumber);
      } else if (credentials.email) {
        for (const [_, userData] of this.registeredUsers) {
          if (userData.email === credentials.email) {
            user = userData;
            break;
          }
        }
      }

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

      // Simplified password verification for demo
      const passwordValid = user.passwordHash === `hashed_${credentials.password}`;
      if (!passwordValid) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Generate session token
      const sessionToken = this.generateSessionToken(user);

      // Store active session
      const sessionId = this.generateSessionId();
      this.activeSessions.set(sessionId, {
        sessionId,
        regNumber: user.regNumber,
        startTime: Date.now(),
        lastActivity: Date.now(),
        ipAddress: '127.0.0.1', // Would be real IP in production
        userAgent: 'ChittyChain Evidence Ledger'
      });

      return {
        success: true,
        sessionToken,
        profile: {
          regNumber: user.regNumber,
          fullName: user.fullName,
          role: user.role,
          authorizedCases: user.authorizedCases,
          trustScore: user.trustScore
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Authentication failed',
        details: error.message
      };
    }
  }

  async verifySession(token: string): Promise<{ valid: boolean; user?: any; error?: string }> {
    try {
      // In a real implementation, this would verify JWT token
      // For demo, we'll just check if it's a valid format
      if (!token || !token.startsWith('chitty_')) {
        return { valid: false, error: 'Invalid token format' };
      }

      // Extract user info from token (simplified)
      const regNumber = token.split('_')[1];
      const user = this.registeredUsers.get(regNumber);

      if (!user) {
        return { valid: false, error: 'User not found' };
      }

      return {
        valid: true,
        user: {
          regNumber: user.regNumber,
          fullName: user.fullName,
          role: user.role,
          trustScore: user.trustScore
        }
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  checkCaseAccess(regNumber: string, caseId: string): boolean {
    const user = this.registeredUsers.get(regNumber);
    if (!user) return false;

    // Check if user is authorized for this case
    return user.authorizedCases.includes(caseId) || 
           user.role === UserType.COURT_OFFICER; // Court officers have access to all cases
  }

  private generateRegistrationNumber(): string {
    const random = Math.floor(Math.random() * 99999999);
    return `REG${random.toString().padStart(8, '0')}`;
  }

  private generateSessionToken(user: any): string {
    // Simplified token generation for demo
    return `chitty_${user.regNumber}_${Date.now()}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private determineSecurityLevel(role: UserType): number {
    switch (role) {
      case UserType.COURT_OFFICER:
        return 3; // Highest security
      case UserType.ATTORNEY_PETITIONER:
      case UserType.ATTORNEY_RESPONDENT:
        return 2; // High security
      case UserType.EXPERT_WITNESS:
        return 2; // High security
      case UserType.PRO_SE_LITIGANT:
        return 1; // Standard security
      case UserType.THIRD_PARTY:
        return 1; // Standard security
      default:
        return 1;
    }
  }

  // Development methods
  getRegisteredUsers(): Array<{ regNumber: string; fullName: string; role: UserType; trustScore: number }> {
    return Array.from(this.registeredUsers.values()).map(user => ({
      regNumber: user.regNumber,
      fullName: user.fullName,
      role: user.role,
      trustScore: user.trustScore
    }));
  }

  getActiveSessions(): number {
    return this.activeSessions.size;
  }
}

// Singleton instance
export const authenticationGateway = new AuthenticationGateway();