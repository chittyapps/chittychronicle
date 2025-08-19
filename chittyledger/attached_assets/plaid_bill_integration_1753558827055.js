/**
 * Plaid Bill Retrieval Integration
 * Automated bill fetching from USAA, Xfinity, ComEd, and Peoples Gas
 */

import { PlaidApi, Configuration, PlaidEnvironments } from 'plaid';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Plaid configuration
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox'; // 'sandbox', 'development', or 'production'

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// Supported billers configuration
const SUPPORTED_BILLERS = {
  usaa: {
    id: 'usaa',
    name: 'USAA',
    institution_id: 'ins_109508',
    account_types: ['insurance', 'banking'],
    bill_types: ['auto_insurance', 'home_insurance', 'life_insurance', 'banking'],
    category: 'insurance'
  },
  xfinity: {
    id: 'xfinity',
    name: 'Xfinity/Comcast',
    institution_id: 'ins_109512',
    account_types: ['utilities'],
    bill_types: ['internet', 'cable', 'phone'],
    category: 'utilities'
  },
  comed: {
    id: 'comed',
    name: 'ComEd',
    institution_id: 'ins_109515',
    account_types: ['utilities'],
    bill_types: ['electricity'],
    category: 'utilities'
  },
  peoples_gas: {
    id: 'peoples_gas',
    name: 'Peoples Gas',
    institution_id: 'ins_109516',
    account_types: ['utilities'],
    bill_types: ['natural_gas'],
    category: 'utilities'
  }
};

export const plaidBillWorkflows = {
  // Initialize Plaid Link for a specific biller
  initializePlaidLink: {
    name: 'initializePlaidLink',
    description: 'Initialize Plaid Link for connecting to a specific biller account',
    parameters: {
      biller: {
        type: 'string',
        enum: ['usaa', 'xfinity', 'comed', 'peoples_gas'],
        description: 'Biller to connect to'
      },
      userId: {
        type: 'string',
        description: 'User ID for tracking connections'
      }
    },
    execute: async (params, context) => {
      const { biller, userId } = params;
      const billerConfig = SUPPORTED_BILLERS[biller];

      if (!billerConfig) {
        throw new Error(`Unsupported biller: ${biller}`);
      }

      try {
        // Create Plaid Link token for specific institution
        const linkTokenResponse = await plaidClient.linkTokenCreate({
          user: {
            client_user_id: userId,
          },
          client_name: 'ChittyOS Bill Retrieval',
          products: ['transactions', 'liabilities'],
          country_codes: ['US'],
          language: 'en',
          institution_id: billerConfig.institution_id,
          account_filters: {
            [billerConfig.account_types[0]]: {
              account_subtypes: billerConfig.bill_types
            }
          }
        });

        const linkToken = linkTokenResponse.data.link_token;

        // Store link token for frontend use
        await context.memory.store({
          namespace: 'PlaidBills',
          key: `link_token_${biller}_${userId}_${Date.now()}`,
          value: {
            biller: biller,
            biller_name: billerConfig.name,
            user_id: userId,
            link_token: linkToken,
            institution_id: billerConfig.institution_id,
            status: 'pending_connection',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
          },
          metadata: {
            type: 'plaid_link_token',
            biller: biller,
            user_id: userId,
            searchTerms: [biller, billerConfig.name, 'plaid', 'connection']
          }
        });

        return {
          success: true,
          biller: biller,
          biller_name: billerConfig.name,
          link_token: linkToken,
          frontend_url: `https://cdn.plaid.com/link/v2/stable/link.html?isWebView=true&token=${linkToken}`,
          expires_in: 1800 // 30 minutes
        };

      } catch (error) {
        console.error(`Plaid link initialization error for ${biller}:`, error);
        throw new Error(`Failed to initialize Plaid link for ${biller}: ${error.message}`);
      }
    }
  },

  // Exchange public token for access token
  exchangePlaidToken: {
    name: 'exchangePlaidToken',
    description: 'Exchange Plaid public token for access token after user connection',
    parameters: {
      publicToken: {
        type: 'string',
        description: 'Public token from Plaid Link'
      },
      biller: {
        type: 'string',
        enum: ['usaa', 'xfinity', 'comed', 'peoples_gas'],
        description: 'Biller that was connected'
      },
      userId: {
        type: 'string',
        description: 'User ID'
      }
    },
    execute: async (params, context) => {
      const { publicToken, biller, userId } = params;
      const billerConfig = SUPPORTED_BILLERS[biller];

      try {
        // Exchange public token for access token
        const exchangeResponse = await plaidClient.itemPublicTokenExchange({
          public_token: publicToken,
        });

        const accessToken = exchangeResponse.data.access_token;
        const itemId = exchangeResponse.data.item_id;

        // Get account information
        const accountsResponse = await plaidClient.accountsGet({
          access_token: accessToken,
        });

        const accounts = accountsResponse.data.accounts;

        // Store access token and account info securely
        await context.memory.store({
          namespace: 'PlaidBills',
          key: `access_token_${biller}_${userId}`,
          value: {
            biller: biller,
            biller_name: billerConfig.name,
            user_id: userId,
            access_token: accessToken, // Should be encrypted in production
            item_id: itemId,
            accounts: accounts.map(acc => ({
              account_id: acc.account_id,
              name: acc.name,
              type: acc.type,
              subtype: acc.subtype,
              mask: acc.mask
            })),
            connected_at: new Date().toISOString(),
            status: 'connected'
          },
          metadata: {
            type: 'plaid_access_token',
            biller: biller,
            user_id: userId,
            searchTerms: [biller, billerConfig.name, 'plaid', 'connected', 'access_token']
          }
        });

        // Record successful connection on ChittyChain
        await context.blockchain.record({
          type: 'PLAID_BILLER_CONNECTION',
          data: {
            biller: biller,
            user_id: userId,
            item_id: itemId,
            accounts_connected: accounts.length,
            hash: context.utils.hash({ biller, user_id: userId, item_id: itemId })
          }
        });

        return {
          success: true,
          biller: biller,
          biller_name: billerConfig.name,
          item_id: itemId,
          accounts_connected: accounts.length,
          accounts: accounts.map(acc => ({
            account_id: acc.account_id,
            name: acc.name,
            type: acc.type,
            subtype: acc.subtype
          })),
          status: 'connected'
        };

      } catch (error) {
        console.error(`Token exchange error for ${biller}:`, error);
        throw new Error(`Failed to exchange token for ${biller}: ${error.message}`);
      }
    }
  },

  // Retrieve bills from specific biller
  retrieveBillsFromBiller: {
    name: 'retrieveBillsFromBiller',
    description: 'Retrieve bills and transactions from a connected biller',
    parameters: {
      biller: {
        type: 'string',
        enum: ['usaa', 'xfinity', 'comed', 'peoples_gas'],
        description: 'Biller to retrieve bills from'
      },
      userId: {
        type: 'string',
        description: 'User ID'
      },
      dateRange: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' }
        },
        required: ['startDate', 'endDate']
      }
    },
    execute: async (params, context) => {
      const { biller, userId, dateRange } = params;
      const billerConfig = SUPPORTED_BILLERS[biller];

      try {
        // Retrieve stored access token
        const tokenData = await getStoredAccessToken(biller, userId, context);
        if (!tokenData) {
          throw new Error(`No connection found for ${biller}. Please connect first.`);
        }

        const accessToken = tokenData.access_token;
        const bills = [];

        // Get transactions for the date range
        const transactionsResponse = await plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
        });

        const transactions = transactionsResponse.data.transactions;

        // Get liabilities (for insurance/loan payments)
        let liabilities = null;
        try {
          const liabilitiesResponse = await plaidClient.liabilitiesGet({
            access_token: accessToken,
          });
          liabilities = liabilitiesResponse.data.liabilities;
        } catch (error) {
          console.log(`Liabilities not available for ${biller}:`, error.message);
        }

        // Process transactions into bill format
        for (const transaction of transactions) {
          if (isBillTransaction(transaction, billerConfig)) {
            const bill = {
              bill_id: transaction.transaction_id,
              biller: biller,
              biller_name: billerConfig.name,
              account_id: transaction.account_id,
              amount: Math.abs(transaction.amount),
              date: transaction.date,
              description: transaction.name,
              category: transaction.category,
              bill_type: determineBillType(transaction, billerConfig),
              status: 'paid',
              payment_method: 'auto_pay',
              retrieved_at: new Date().toISOString()
            };

            bills.push(bill);

            // Store individual bill in Memory-Cloude
            await context.memory.store({
              namespace: 'Bills',
              key: `${biller}_${bill.bill_id}_${Date.now()}`,
              value: bill,
              metadata: {
                type: 'bill',
                source: 'plaid',
                biller: biller,
                bill_type: bill.bill_type,
                searchTerms: [biller, billerConfig.name, bill.bill_type, bill.date]
              }
            });
          }
        }

        // Record retrieval on ChittyChain
        await context.blockchain.record({
          type: 'PLAID_BILL_RETRIEVAL',
          data: {
            biller: biller,
            user_id: userId,
            bills_retrieved: bills.length,
            date_range: dateRange,
            hash: context.utils.hash({ bills: bills.map(b => b.bill_id) })
          }
        });

        return {
          success: true,
          biller: biller,
          biller_name: billerConfig.name,
          bills_retrieved: bills.length,
          date_range: dateRange,
          total_amount: bills.reduce((sum, bill) => sum + bill.amount, 0),
          bills: bills
        };

      } catch (error) {
        console.error(`Bill retrieval error for ${biller}:`, error);
        throw new Error(`Failed to retrieve bills from ${biller}: ${error.message}`);
      }
    }
  },

  // Retrieve bills from all connected billers
  retrieveAllPlaidBills: {
    name: 'retrieveAllPlaidBills',
    description: 'Retrieve bills from all connected Plaid billers',
    parameters: {
      userId: {
        type: 'string',
        description: 'User ID'
      },
      dateRange: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' }
        },
        required: ['startDate', 'endDate']
      }
    },
    execute: async (params, context) => {
      const { userId, dateRange } = params;
      const results = {
        usaa: null,
        xfinity: null,
        comed: null,
        peoples_gas: null,
        totalBills: 0,
        totalAmount: 0,
        errors: []
      };

      // Try to retrieve from each biller
      for (const [billerId, billerConfig] of Object.entries(SUPPORTED_BILLERS)) {
        try {
          const billerResult = await plaidBillWorkflows.retrieveBillsFromBiller.execute(
            { biller: billerId, userId, dateRange },
            context
          );

          results[billerId] = billerResult;
          results.totalBills += billerResult.bills_retrieved;
          results.totalAmount += billerResult.total_amount;

        } catch (error) {
          results.errors.push({ 
            biller: billerId, 
            biller_name: billerConfig.name,
            error: error.message 
          });
        }
      }

      return {
        success: results.errors.length < Object.keys(SUPPORTED_BILLERS).length,
        summary: {
          total_bills: results.totalBills,
          total_amount: results.totalAmount,
          date_range: dateRange,
          billers_successful: Object.keys(SUPPORTED_BILLERS).length - results.errors.length,
          billers_failed: results.errors.length
        },
        billers: {
          usaa: results.usaa,
          xfinity: results.xfinity,
          comed: results.comed,
          peoples_gas: results.peoples_gas
        },
        errors: results.errors
      };
    }
  },

  // Monitor for new bills
  monitorPlaidBills: {
    name: 'monitorPlaidBills',
    description: 'Monitor for new bills from connected Plaid billers',
    parameters: {
      userId: {
        type: 'string',
        description: 'User ID'
      },
      billers: {
        type: 'array',
        items: { type: 'string', enum: ['usaa', 'xfinity', 'comed', 'peoples_gas'] },
        default: ['usaa', 'xfinity', 'comed', 'peoples_gas'],
        description: 'Billers to monitor'
      }
    },
    execute: async (params, context) => {
      const { userId, billers } = params;
      const newBills = [];
      const errors = [];

      // Check each biller for new transactions in the last 7 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      for (const biller of billers) {
        try {
          const billerResult = await plaidBillWorkflows.retrieveBillsFromBiller.execute(
            { biller, userId, dateRange: { startDate, endDate } },
            context
          );

          // Check if these are new bills (not already stored)
          for (const bill of billerResult.bills) {
            const existingBill = await checkIfBillExists(bill, context);
            if (!existingBill) {
              newBills.push(bill);
            }
          }

        } catch (error) {
          errors.push({ biller, error: error.message });
        }
      }

      // Record monitoring results
      await context.blockchain.record({
        type: 'PLAID_BILL_MONITORING',
        data: {
          user_id: userId,
          billers_monitored: billers,
          new_bills_found: newBills.length,
          monitoring_date: new Date().toISOString(),
          hash: context.utils.hash({ user_id: userId, new_bills: newBills.length })
        }
      });

      return {
        success: true,
        monitoring_summary: {
          billers_monitored: billers.length,
          new_bills_found: newBills.length,
          total_new_amount: newBills.reduce((sum, bill) => sum + bill.amount, 0),
          monitoring_period: { startDate, endDate }
        },
        new_bills: newBills,
        errors: errors
      };
    }
  },

  // Manage Plaid connections
  managePlaidConnections: {
    name: 'managePlaidConnections',
    description: 'Manage and refresh Plaid biller connections',
    parameters: {
      userId: {
        type: 'string',
        description: 'User ID'
      },
      action: {
        type: 'string',
        enum: ['list', 'refresh', 'disconnect'],
        description: 'Action to perform'
      },
      biller: {
        type: 'string',
        enum: ['usaa', 'xfinity', 'comed', 'peoples_gas'],
        description: 'Specific biller (required for refresh/disconnect)'
      }
    },
    execute: async (params, context) => {
      const { userId, action, biller } = params;

      switch (action) {
        case 'list':
          return await listConnections(userId, context);
        
        case 'refresh':
          if (!biller) throw new Error('Biller required for refresh action');
          return await refreshConnection(biller, userId, context);
        
        case 'disconnect':
          if (!biller) throw new Error('Biller required for disconnect action');
          return await disconnectBiller(biller, userId, context);
        
        default:
          throw new Error(`Invalid action: ${action}`);
      }
    }
  }
};

// Helper functions
async function getStoredAccessToken(biller, userId, context) {
  // Would retrieve from Memory-Cloude
  // For now, return mock data
  return null;
}

function isBillTransaction(transaction, billerConfig) {
  // Logic to determine if transaction is a bill payment
  const amount = Math.abs(transaction.amount);
  const description = transaction.name.toLowerCase();
  const category = transaction.category;

  // Check if transaction matches bill patterns
  if (billerConfig.id === 'usaa') {
    return category.includes('Insurance') || description.includes('usaa') || description.includes('insurance');
  } else if (billerConfig.id === 'xfinity') {
    return category.includes('Telecommunication') || description.includes('xfinity') || description.includes('comcast');
  } else if (billerConfig.id === 'comed') {
    return category.includes('Utilities') || description.includes('comed') || description.includes('electric');
  } else if (billerConfig.id === 'peoples_gas') {
    return category.includes('Utilities') || description.includes('peoples gas') || description.includes('gas');
  }

  return false;
}

function determineBillType(transaction, billerConfig) {
  const description = transaction.name.toLowerCase();
  
  if (billerConfig.id === 'usaa') {
    if (description.includes('auto')) return 'auto_insurance';
    if (description.includes('home') || description.includes('property')) return 'home_insurance';
    if (description.includes('life')) return 'life_insurance';
    return 'insurance';
  } else if (billerConfig.id === 'xfinity') {
    if (description.includes('internet')) return 'internet';
    if (description.includes('cable') || description.includes('tv')) return 'cable';
    if (description.includes('phone')) return 'phone';
    return 'internet_cable';
  } else if (billerConfig.id === 'comed') {
    return 'electricity';
  } else if (billerConfig.id === 'peoples_gas') {
    return 'natural_gas';
  }

  return billerConfig.bill_types[0];
}

async function checkIfBillExists(bill, context) {
  // Would check Memory-Cloude for existing bill
  return false;
}

async function listConnections(userId, context) {
  // Would list all stored connections
  return {
    success: true,
    connections: []
  };
}

async function refreshConnection(biller, userId, context) {
  // Would refresh Plaid connection
  return {
    success: true,
    biller: biller,
    action: 'refreshed'
  };
}

async function disconnectBiller(biller, userId, context) {
  // Would disconnect and remove stored tokens
  return {
    success: true,
    biller: biller,
    action: 'disconnected'
  };
}

// Export workflow registration function
export function registerPlaidBillWorkflows(workflowEngine) {
  Object.values(plaidBillWorkflows).forEach(workflow => {
    workflowEngine.register(workflow);
  });
}