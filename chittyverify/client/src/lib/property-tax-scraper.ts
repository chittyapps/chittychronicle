// Property Tax Scraper Integration for Cook County
// Based on the attached property tax scraper workflow

export interface PropertyInfo {
  id: string;
  address: string;
  unit?: string;
  pin: string;
  propertyType: string;
  subdivision?: string;
  description: string;
}

export interface AssessorData {
  pin: string;
  year: number;
  address: string;
  landAssessment: number;
  buildingAssessment: number;
  totalAssessment: number;
  estimatedTax: number;
  propertyClass: string;
  squareFeet?: number;
  yearBuilt?: number;
  success: boolean;
  scrapedAt: string;
}

export interface TreasurerData {
  pin: string;
  currentYear: string;
  totalDue: number;
  amountPaid: number;
  balanceDue: number;
  dueDate: string;
  status: string;
  installments: PaymentInstallment[];
  paymentHistory: PaymentRecord[];
  success: boolean;
  scrapedAt: string;
}

export interface PaymentInstallment {
  installmentNumber: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface PaymentRecord {
  date: string;
  amount: number;
  method: string;
  confirmationNumber: string;
}

export interface ConsolidatedPropertyData {
  property: PropertyInfo;
  pin: string;
  year: number;
  assessorData?: AssessorData;
  treasurerData?: TreasurerData;
  consolidatedAt: string;
  trustScore: number;
}

// Predefined properties from the scraper configuration
export const COOK_COUNTY_PROPERTIES: PropertyInfo[] = [
  {
    id: 'addison_541',
    address: '541 W ADDISON ST',
    unit: '541-3 South',
    pin: '14-21-111-008-1006',
    propertyType: 'C',
    subdivision: '25024798',
    description: 'Unit 541-3 South in the Addition Lake Shore West Condominium'
  },
  {
    id: 'surf_211',
    address: '550 W SURF ST',
    unit: 'C-211',
    pin: '14-28-122-017-1180',
    propertyType: 'C',
    subdivision: '26911238',
    description: 'Unit C-211 in Commodore/Greenbriar Landmark Condominium'
  },
  {
    id: 'surf_504',
    address: '559 W SURF ST',
    unit: 'C-504',
    pin: '14-28-122-017-1091',
    propertyType: 'C',
    subdivision: '26911238',
    description: 'Unit C-504 in Commodore/Greenbrier Landmark Condominium'
  },
  {
    id: 'clarendon_1610',
    address: '4343 N Clarendon Ave',
    unit: '1610',
    pin: '14-16-300-032-1238',
    propertyType: 'C',
    subdivision: undefined,
    description: 'Unit 1610 at 4343 N Clarendon Ave'
  }
];

export class PropertyTaxScraper {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Scrape Cook County Assessor data for given PINs
   */
  async scrapeAssessorData(pins: string[], year: number = 2024): Promise<AssessorData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/property-tax/scrape-assessor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pins, year }),
      });

      if (!response.ok) {
        throw new Error(`Failed to scrape assessor data: ${response.statusText}`);
      }

      const result = await response.json();
      return result.results || [];
    } catch (error) {
      console.error('Error scraping assessor data:', error);
      throw error;
    }
  }

  /**
   * Scrape Cook County Treasurer data for given PINs
   */
  async scrapeTreasurerData(pins: string[], includeHistory: boolean = true): Promise<TreasurerData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/property-tax/scrape-treasurer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pins, includeHistory }),
      });

      if (!response.ok) {
        throw new Error(`Failed to scrape treasurer data: ${response.statusText}`);
      }

      const result = await response.json();
      return result.results || [];
    } catch (error) {
      console.error('Error scraping treasurer data:', error);
      throw error;
    }
  }

  /**
   * Retrieve comprehensive property tax data from all sources
   */
  async retrieveAllPropertyTaxData(
    pins: string[], 
    year: number = 2024, 
    includeHistory: boolean = true
  ): Promise<ConsolidatedPropertyData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/property-tax/scrape-comprehensive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pins, year, includeHistory }),
      });

      if (!response.ok) {
        throw new Error(`Failed to retrieve comprehensive data: ${response.statusText}`);
      }

      const result = await response.json();
      return result.consolidatedData || [];
    } catch (error) {
      console.error('Error retrieving comprehensive property tax data:', error);
      throw error;
    }
  }

  /**
   * Monitor property tax changes for given PINs
   */
  async monitorPropertyTaxChanges(pins: string[], alertThreshold: number = 0.05) {
    try {
      const response = await fetch(`${this.baseUrl}/property-tax/monitor-changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pins, alertThreshold }),
      });

      if (!response.ok) {
        throw new Error(`Failed to monitor property tax changes: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error monitoring property tax changes:', error);
      throw error;
    }
  }

  /**
   * Get property information by PIN
   */
  getPropertyByPin(pin: string): PropertyInfo | undefined {
    return COOK_COUNTY_PROPERTIES.find(property => property.pin === pin);
  }

  /**
   * Validate PIN format for Cook County
   */
  validatePin(pin: string): boolean {
    // Cook County PIN format: XX-XX-XXX-XXX-XXXX
    const pinRegex = /^\d{2}-\d{2}-\d{3}-\d{3}-\d{4}$/;
    return pinRegex.test(pin);
  }

  /**
   * Calculate assessment change percentage
   */
  calculateAssessmentChange(currentAssessment: number, previousAssessment: number): {
    amount: number;
    percentage: number;
  } {
    const amount = currentAssessment - previousAssessment;
    const percentage = previousAssessment > 0 ? (amount / previousAssessment) : 0;
    
    return { amount, percentage };
  }

  /**
   * Generate property tax evidence metadata
   */
  generatePropertyTaxEvidence(data: ConsolidatedPropertyData): {
    title: string;
    description: string;
    type: string;
    subtype: string;
    facts: Record<string, any>;
    metadata: Record<string, any>;
  } {
    const property = data.property;
    const assessor = data.assessorData;
    const treasurer = data.treasurerData;

    return {
      title: `Property Tax Record - ${property.address}`,
      description: `${data.year} property tax assessment and payment data for ${property.description}`,
      type: 'property_tax',
      subtype: 'comprehensive_record',
      facts: {
        pin: data.pin,
        address: property.address,
        unit: property.unit,
        year: data.year,
        landAssessment: assessor?.landAssessment,
        buildingAssessment: assessor?.buildingAssessment,
        totalAssessment: assessor?.totalAssessment,
        estimatedTax: assessor?.estimatedTax,
        propertyClass: assessor?.propertyClass,
        squareFeet: assessor?.squareFeet,
        yearBuilt: assessor?.yearBuilt,
        totalDue: treasurer?.totalDue,
        amountPaid: treasurer?.amountPaid,
        balanceDue: treasurer?.balanceDue,
        paymentStatus: treasurer?.status,
        installmentCount: treasurer?.installments?.length,
        paymentHistoryCount: treasurer?.paymentHistory?.length,
      },
      metadata: {
        source: 'cook_county_comprehensive',
        propertyType: property.propertyType,
        subdivision: property.subdivision,
        assessorDataAvailable: !!assessor?.success,
        treasurerDataAvailable: !!treasurer?.success,
        trustScore: data.trustScore,
        consolidatedAt: data.consolidatedAt,
      },
    };
  }
}

// Export singleton instance
export const propertyTaxScraper = new PropertyTaxScraper();

// Export utility functions
export const PropertyTaxUtils = {
  formatPin: (pin: string): string => {
    // Remove any existing dashes and add proper formatting
    const cleaned = pin.replace(/-/g, '');
    if (cleaned.length === 14) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7, 10)}-${cleaned.slice(10, 14)}`;
    }
    return pin;
  },

  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  },

  formatDate: (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  },

  calculateTrustScore: (assessorData?: AssessorData, treasurerData?: TreasurerData): number => {
    let score = 0;
    let factors = 0;

    if (assessorData?.success) {
      score += 50;
      factors++;
      
      // Bonus for complete data
      if (assessorData.landAssessment && assessorData.buildingAssessment) score += 10;
      if (assessorData.squareFeet) score += 5;
      if (assessorData.yearBuilt) score += 5;
    }

    if (treasurerData?.success) {
      score += 30;
      factors++;
      
      // Bonus for payment history
      if (treasurerData.paymentHistory?.length > 0) score += 10;
      if (treasurerData.installments?.length > 0) score += 5;
    }

    // Adjust for data availability
    if (factors === 0) return 0;
    if (factors === 1) score = Math.min(score, 75); // Cap at 75 if only one source

    return Math.min(score, 100);
  },
};
