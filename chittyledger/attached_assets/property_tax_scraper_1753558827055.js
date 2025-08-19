/**
 * Cook County Property Tax Scraper
 * Automated property tax data retrieval for Chicago properties
 */

import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Property definitions from user input
const PROPERTIES = [
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
    subdivision: null,
    description: 'Unit 1610 at 4343 N Clarendon Ave'
  }
];

export const propertyTaxWorkflows = {
  // Scrape Cook County Assessor Data
  scrapeCookCountyAssessor: {
    name: 'scrapeCookCountyAssessor',
    description: 'Retrieve property assessment data from Cook County Assessor',
    parameters: {
      pins: {
        type: 'array',
        items: { type: 'string' },
        description: 'Property Index Numbers (PINs) to lookup'
      },
      year: {
        type: 'number',
        default: 2024,
        description: 'Tax year to retrieve'
      }
    },
    execute: async (params, context) => {
      const { pins = PROPERTIES.map(p => p.pin), year = 2024 } = params;
      const results = [];

      try {
        const browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        for (const pin of pins) {
          try {
            const assessorData = await scrapeAssessorData(browser, pin, year);
            results.push(assessorData);

            // Store in Memory-Cloude
            await context.memory.store({
              namespace: 'PropertyTax',
              key: `assessor_${pin}_${year}_${Date.now()}`,
              value: assessorData,
              metadata: {
                type: 'assessor_data',
                pin: pin,
                year: year,
                source: 'cook_county_assessor',
                searchTerms: [pin, assessorData.address, 'property_tax', 'assessment']
              }
            });

          } catch (error) {
            console.error(`Failed to scrape PIN ${pin}:`, error);
            results.push({ pin, error: error.message, success: false });
          }
        }

        await browser.close();

        // Record on ChittyChain
        await context.blockchain.record({
          type: 'PROPERTY_ASSESSMENT_RETRIEVAL',
          data: {
            pins: pins,
            year: year,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            hash: context.utils.hash({ results: results.map(r => r.pin) })
          }
        });

        return {
          success: true,
          year: year,
          properties_scraped: results.length,
          successful: results.filter(r => r.success).length,
          results: results
        };

      } catch (error) {
        console.error('Cook County Assessor scraping error:', error);
        throw new Error(`Failed to scrape assessor data: ${error.message}`);
      }
    }
  },

  // Scrape Cook County Treasurer Data  
  scrapeCookCountyTreasurer: {
    name: 'scrapeCookCountyTreasurer',
    description: 'Retrieve property tax payment data from Cook County Treasurer',
    parameters: {
      pins: {
        type: 'array',
        items: { type: 'string' },
        description: 'Property Index Numbers (PINs) to lookup'
      },
      includeHistory: {
        type: 'boolean',
        default: true,
        description: 'Include payment history'
      }
    },
    execute: async (params, context) => {
      const { pins = PROPERTIES.map(p => p.pin), includeHistory = true } = params;
      const results = [];

      try {
        const browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        for (const pin of pins) {
          try {
            const treasurerData = await scrapeTreasurerData(browser, pin, includeHistory);
            results.push(treasurerData);

            // Store in Memory-Cloude
            await context.memory.store({
              namespace: 'PropertyTax',
              key: `treasurer_${pin}_${Date.now()}`,
              value: treasurerData,
              metadata: {
                type: 'treasurer_data',
                pin: pin,
                source: 'cook_county_treasurer',
                searchTerms: [pin, treasurerData.address, 'property_tax', 'payments']
              }
            });

          } catch (error) {
            console.error(`Failed to scrape treasurer data for PIN ${pin}:`, error);
            results.push({ pin, error: error.message, success: false });
          }
        }

        await browser.close();

        // Record on ChittyChain
        await context.blockchain.record({
          type: 'PROPERTY_TAX_PAYMENT_RETRIEVAL',
          data: {
            pins: pins,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            hash: context.utils.hash({ results: results.map(r => r.pin) })
          }
        });

        return {
          success: true,
          properties_scraped: results.length,
          successful: results.filter(r => r.success).length,
          results: results
        };

      } catch (error) {
        console.error('Cook County Treasurer scraping error:', error);
        throw new Error(`Failed to scrape treasurer data: ${error.message}`);
      }
    }
  },

  // Comprehensive Property Tax Retrieval
  retrieveAllPropertyTaxData: {
    name: 'retrieveAllPropertyTaxData',
    description: 'Retrieve comprehensive property tax data from all Cook County sources',
    parameters: {
      pins: {
        type: 'array',
        items: { type: 'string' },
        description: 'Property Index Numbers (PINs) to lookup'
      },
      year: {
        type: 'number',
        default: 2024,
        description: 'Tax year to retrieve'
      },
      includeHistory: {
        type: 'boolean',
        default: true,
        description: 'Include historical payment data'
      }
    },
    execute: async (params, context) => {
      const { pins = PROPERTIES.map(p => p.pin), year = 2024, includeHistory = true } = params;
      
      const comprehensiveResults = {
        pins: pins,
        year: year,
        assessor_data: null,
        treasurer_data: null,
        consolidated_data: [],
        errors: []
      };

      try {
        // Get assessor data
        try {
          comprehensiveResults.assessor_data = await propertyTaxWorkflows.scrapeCookCountyAssessor.execute(
            { pins, year },
            context
          );
        } catch (error) {
          comprehensiveResults.errors.push({ source: 'assessor', error: error.message });
        }

        // Get treasurer data
        try {
          comprehensiveResults.treasurer_data = await propertyTaxWorkflows.scrapeCookCountyTreasurer.execute(
            { pins, includeHistory },
            context
          );
        } catch (error) {
          comprehensiveResults.errors.push({ source: 'treasurer', error: error.message });
        }

        // Consolidate data for each property
        for (const pin of pins) {
          const property = PROPERTIES.find(p => p.pin === pin);
          const assessorResult = comprehensiveResults.assessor_data?.results?.find(r => r.pin === pin);
          const treasurerResult = comprehensiveResults.treasurer_data?.results?.find(r => r.pin === pin);

          const consolidatedProperty = {
            ...property,
            pin: pin,
            year: year,
            assessor_data: assessorResult,
            treasurer_data: treasurerResult,
            consolidated_at: new Date().toISOString()
          };

          comprehensiveResults.consolidated_data.push(consolidatedProperty);

          // Store consolidated data in Memory-Cloude
          await context.memory.store({
            namespace: 'PropertyTax',
            key: `consolidated_${pin}_${year}_${Date.now()}`,
            value: consolidatedProperty,
            metadata: {
              type: 'consolidated_property_tax',
              pin: pin,
              year: year,
              address: property.address,
              unit: property.unit,
              searchTerms: [pin, property.address, property.unit, 'property_tax', 'consolidated']
            }
          });
        }

        return {
          success: comprehensiveResults.errors.length === 0,
          properties_processed: pins.length,
          assessor_success: !!comprehensiveResults.assessor_data?.success,
          treasurer_success: !!comprehensiveResults.treasurer_data?.success,
          consolidated_data: comprehensiveResults.consolidated_data,
          errors: comprehensiveResults.errors
        };

      } catch (error) {
        console.error('Comprehensive property tax retrieval error:', error);
        throw new Error(`Failed comprehensive retrieval: ${error.message}`);
      }
    }
  },

  // Monitor Property Tax Changes
  monitorPropertyTaxChanges: {
    name: 'monitorPropertyTaxChanges',
    description: 'Monitor for changes in property tax assessments and payments',
    parameters: {
      pins: {
        type: 'array',
        items: { type: 'string' },
        description: 'Property Index Numbers (PINs) to monitor'
      },
      alertThreshold: {
        type: 'number',
        default: 0.05,
        description: 'Alert if assessment changes by more than this percentage'
      }
    },
    execute: async (params, context) => {
      const { pins = PROPERTIES.map(p => p.pin), alertThreshold = 0.05 } = params;
      
      const changes = [];
      const alerts = [];

      for (const pin of pins) {
        // Get current data
        const currentData = await getCurrentPropertyData(pin, context);
        
        // Get historical data from Memory-Cloude
        const historicalData = await getHistoricalPropertyData(pin, context);

        if (currentData && historicalData) {
          const assessmentChange = calculateAssessmentChange(currentData, historicalData);
          
          changes.push({
            pin: pin,
            current_assessment: currentData.assessed_value,
            previous_assessment: historicalData.assessed_value,
            change_amount: assessmentChange.amount,
            change_percentage: assessmentChange.percentage,
            alert_triggered: Math.abs(assessmentChange.percentage) > alertThreshold
          });

          if (Math.abs(assessmentChange.percentage) > alertThreshold) {
            alerts.push({
              pin: pin,
              address: currentData.address,
              change_type: assessmentChange.percentage > 0 ? 'increase' : 'decrease',
              change_percentage: assessmentChange.percentage,
              change_amount: assessmentChange.amount
            });
          }
        }
      }

      // Record monitoring results on ChittyChain
      await context.blockchain.record({
        type: 'PROPERTY_TAX_MONITORING',
        data: {
          pins: pins,
          changes_detected: changes.length,
          alerts_triggered: alerts.length,
          alert_threshold: alertThreshold,
          hash: context.utils.hash({ changes, alerts })
        }
      });

      return {
        success: true,
        properties_monitored: pins.length,
        changes_detected: changes.length,
        alerts_triggered: alerts.length,
        alert_threshold: alertThreshold,
        changes: changes,
        alerts: alerts
      };
    }
  }
};

// Helper function to scrape Cook County Assessor data
async function scrapeAssessorData(browser, pin, year) {
  const page = await browser.newPage();
  
  try {
    // Navigate to Cook County Assessor search
    await page.goto('https://www.cookcountyassessor.com/property-search');
    
    // Enter PIN
    await page.waitForSelector('#propertySearchInput');
    await page.type('#propertySearchInput', pin);
    await page.click('button[type="submit"]');
    
    // Wait for results
    await page.waitForSelector('.property-card', { timeout: 10000 });
    
    // Extract property data
    const propertyData = await page.evaluate((pin, year) => {
      const data = {
        pin: pin,
        year: year,
        success: true,
        scraped_at: new Date().toISOString()
      };

      // Extract basic property info
      const addressElement = document.querySelector('.property-address');
      if (addressElement) {
        data.address = addressElement.textContent.trim();
      }

      // Extract assessment values
      const assessmentTable = document.querySelector('.assessment-table');
      if (assessmentTable) {
        const rows = assessmentTable.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const label = cells[0].textContent.trim().toLowerCase();
            const value = cells[1].textContent.trim();
            
            if (label.includes('land')) {
              data.land_assessment = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
            } else if (label.includes('building')) {
              data.building_assessment = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
            } else if (label.includes('total')) {
              data.total_assessment = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
            }
          }
        });
      }

      // Extract tax information
      const taxElements = document.querySelectorAll('.tax-info .value');
      if (taxElements.length > 0) {
        data.estimated_tax = parseFloat(taxElements[0].textContent.replace(/[^0-9.]/g, '')) || 0;
      }

      // Extract property characteristics
      const characteristicsSection = document.querySelector('.property-characteristics');
      if (characteristicsSection) {
        data.property_class = characteristicsSection.querySelector('.property-class')?.textContent?.trim();
        data.square_feet = parseInt(characteristicsSection.querySelector('.square-feet')?.textContent?.replace(/[^0-9]/g, '')) || null;
        data.year_built = parseInt(characteristicsSection.querySelector('.year-built')?.textContent?.replace(/[^0-9]/g, '')) || null;
      }

      return data;
    }, pin, year);

    return propertyData;

  } catch (error) {
    console.error(`Error scraping assessor data for PIN ${pin}:`, error);
    return {
      pin: pin,
      year: year,
      success: false,
      error: error.message,
      scraped_at: new Date().toISOString()
    };
  } finally {
    await page.close();
  }
}

// Helper function to scrape Cook County Treasurer data
async function scrapeTreasurerData(browser, pin, includeHistory) {
  const page = await browser.newPage();
  
  try {
    // Navigate to Cook County Treasurer search
    await page.goto('https://www.cookcountytreasurer.com/propertytaxes');
    
    // Enter PIN
    await page.waitForSelector('#pin-search');
    await page.type('#pin-search', pin);
    await page.click('#search-button');
    
    // Wait for results
    await page.waitForSelector('.tax-bill-info', { timeout: 10000 });
    
    // Extract tax payment data
    const treasurerData = await page.evaluate((pin, includeHistory) => {
      const data = {
        pin: pin,
        success: true,
        scraped_at: new Date().toISOString()
      };

      // Extract current tax bill information
      const currentBill = document.querySelector('.current-tax-bill');
      if (currentBill) {
        data.current_year = currentBill.querySelector('.tax-year')?.textContent?.trim();
        data.total_due = parseFloat(currentBill.querySelector('.total-due')?.textContent?.replace(/[^0-9.]/g, '')) || 0;
        data.amount_paid = parseFloat(currentBill.querySelector('.amount-paid')?.textContent?.replace(/[^0-9.]/g, '')) || 0;
        data.balance_due = parseFloat(currentBill.querySelector('.balance-due')?.textContent?.replace(/[^0-9.]/g, '')) || 0;
        data.due_date = currentBill.querySelector('.due-date')?.textContent?.trim();
        data.status = currentBill.querySelector('.payment-status')?.textContent?.trim();
      }

      // Extract installment information
      const installments = document.querySelectorAll('.installment-info');
      data.installments = [];
      installments.forEach(installment => {
        const installmentData = {
          installment_number: installment.querySelector('.installment-number')?.textContent?.trim(),
          amount: parseFloat(installment.querySelector('.installment-amount')?.textContent?.replace(/[^0-9.]/g, '')) || 0,
          due_date: installment.querySelector('.installment-due-date')?.textContent?.trim(),
          status: installment.querySelector('.installment-status')?.textContent?.trim()
        };
        data.installments.push(installmentData);
      });

      // Extract payment history if requested
      if (includeHistory) {
        const paymentHistory = document.querySelectorAll('.payment-history-row');
        data.payment_history = [];
        paymentHistory.forEach(payment => {
          const paymentData = {
            date: payment.querySelector('.payment-date')?.textContent?.trim(),
            amount: parseFloat(payment.querySelector('.payment-amount')?.textContent?.replace(/[^0-9.]/g, '')) || 0,
            method: payment.querySelector('.payment-method')?.textContent?.trim(),
            confirmation: payment.querySelector('.confirmation-number')?.textContent?.trim()
          };
          data.payment_history.push(paymentData);
        });
      }

      return data;
    }, pin, includeHistory);

    return treasurerData;

  } catch (error) {
    console.error(`Error scraping treasurer data for PIN ${pin}:`, error);
    return {
      pin: pin,
      success: false,
      error: error.message,
      scraped_at: new Date().toISOString()
    };
  } finally {
    await page.close();
  }
}

// Helper functions for monitoring
async function getCurrentPropertyData(pin, context) {
  // Retrieve current data - would integrate with Memory-Cloude
  return null;
}

async function getHistoricalPropertyData(pin, context) {
  // Retrieve historical data - would integrate with Memory-Cloude
  return null;
}

function calculateAssessmentChange(current, historical) {
  const currentValue = current.total_assessment || 0;
  const historicalValue = historical.total_assessment || 0;
  
  const amount = currentValue - historicalValue;
  const percentage = historicalValue > 0 ? (amount / historicalValue) : 0;
  
  return { amount, percentage };
}

// Export workflow registration function
export function registerPropertyTaxWorkflows(workflowEngine) {
  Object.values(propertyTaxWorkflows).forEach(workflow => {
    workflowEngine.register(workflow);
  });
}