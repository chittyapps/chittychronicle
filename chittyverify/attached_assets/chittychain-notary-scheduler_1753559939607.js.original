#!/usr/bin/env node

/**
 * ChittyChain Notary Scheduler - Appointment & Demand Aggregation System
 * 
 * Handles appointment-based notarization with demand aggregation,
 * notary bidding, and automated scheduling for network launch phase.
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

export class ChittyChainNotaryScheduler extends EventEmitter {
  constructor(notaryNetwork, config = {}) {
    super();
    this.notaryNetwork = notaryNetwork;
    this.config = {
      // Scheduling configuration
      scheduling: {
        mode: 'APPOINTMENT', // APPOINTMENT | ON_DEMAND | HYBRID
        appointmentSlots: 30, // minutes per slot
        businessHours: {
          start: 9, // 9 AM
          end: 17, // 5 PM
          timezone: 'America/Los_Angeles'
        },
        aggregationWindow: 24, // hours to aggregate demand
        minNotarizationsPerSession: 3, // Minimum to make it worthwhile
        maxNotarizationsPerSession: 10 // Maximum per appointment block
      },
      
      // Demand aggregation
      aggregation: {
        enabled: true,
        categories: {
          'URGENT': { window: 4, premium: 2.0 },
          'STANDARD': { window: 24, premium: 1.0 },
          'BULK': { window: 72, premium: 0.8 }
        },
        minimumDemandThreshold: 3, // Min requests to trigger notification
        geographicGrouping: true,
        typeGrouping: true // Group similar document types
      },
      
      // Bidding system
      bidding: {
        enabled: true,
        minimumBid: 0.8, // 80% of base rate
        maximumBid: 1.5, // 150% of base rate
        bidDuration: 2, // hours
        autoBidEnabled: true, // Allow notaries to set auto-bid rules
        factorsConsidered: ['price', 'reputation', 'availability', 'location']
      },
      
      // Notification system
      notifications: {
        channels: ['email', 'sms', 'app'],
        aggregatedDemandAlerts: true,
          leadTime: 24, // hours before appointment
        reminderSchedule: [24, 2, 0.5] // hours before appointment
      },
      
      ...config
    };
    
    // Scheduler state
    this.appointments = new Map(); // appointmentId -> appointment
    this.demandQueue = new Map(); // category -> requests[]
    this.notarySchedules = new Map(); // notaryId -> schedule
    this.activeBids = new Map(); // bidId -> bid
    this.aggregatedDemand = new Map(); // aggregationId -> demand summary
    
    // Initialize scheduler
    this.initializeScheduler();
  }

  /**
   * Initialize the scheduling system
   */
  initializeScheduler() {
    // Start demand aggregation timer
    if (this.config.aggregation.enabled) {
      this.startAggregationTimer();
    }
    
    // Listen for notary registrations
    this.notaryNetwork.on('notaryRegistered', (data) => {
      this.initializeNotarySchedule(data.notaryId);
    });
    
    this.emit('schedulerReady', {
      mode: this.config.scheduling.mode,
      aggregationEnabled: this.config.aggregation.enabled
    });
  }

  /**
   * Submit a notarization request to the queue
   */
  async submitRequest(requestData) {
    const request = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      status: 'QUEUED',
      
      // Request details
      requester: requestData.requester,
      document: requestData.document,
      
      // Scheduling preferences
      scheduling: {
        category: requestData.urgency || 'STANDARD',
        preferredDates: requestData.preferredDates || [],
        preferredTimes: requestData.preferredTimes || [],
        flexibility: requestData.flexibility || 'FLEXIBLE', // FLEXIBLE | MODERATE | STRICT
        timezone: requestData.timezone || 'America/Los_Angeles'
      },
      
      // Requirements
      requirements: {
        state: requestData.state,
        languages: requestData.languages || ['English'],
        specialNeeds: requestData.specialNeeds || [],
        witnesses: requestData.witnesses || 0
      },
      
      // Aggregation
      aggregation: {
        eligible: true,
        aggregationId: null,
        groupingFactors: {
          state: requestData.state,
          documentType: requestData.document.type,
          timeWindow: this.getAggregationWindow(requestData.urgency || 'STANDARD')
        }
      }
    };

    // Add to demand queue
    const category = request.scheduling.category;
    if (!this.demandQueue.has(category)) {
      this.demandQueue.set(category, []);
    }
    this.demandQueue.get(category).push(request);
    
    // Check if we should trigger aggregation
    await this.checkAggregationTriggers(category);
    
    this.emit('requestQueued', {
      requestId: request.id,
      category: category,
      queuePosition: this.demandQueue.get(category).length
    });
    
    return request;
  }

  /**
   * Check if we should trigger demand aggregation
   */
  async checkAggregationTriggers(category) {
    const queue = this.demandQueue.get(category) || [];
    const threshold = this.config.aggregation.minimumDemandThreshold;
    
    if (queue.length >= threshold) {
      // Group by common factors
      const groups = this.groupRequests(queue);
      
      for (const [groupKey, requests] of groups) {
        if (requests.length >= threshold) {
          await this.createAggregatedDemand(groupKey, requests);
        }
      }
    }
  }

  /**
   * Group requests by common factors
   */
  groupRequests(requests) {
    const groups = new Map();
    
    requests.forEach(request => {
      const key = this.generateGroupingKey(request);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(request);
    });
    
    return groups;
  }

  /**
   * Generate grouping key for request
   */
  generateGroupingKey(request) {
    const factors = [];
    
    if (this.config.aggregation.geographicGrouping) {
      factors.push(request.requirements.state);
    }
    
    if (this.config.aggregation.typeGrouping) {
      factors.push(request.document.type);
    }
    
    // Add time window
    const window = this.getAggregationWindow(request.scheduling.category);
    const windowStart = Math.floor(Date.now() / (window * 60 * 60 * 1000));
    factors.push(`window_${windowStart}`);
    
    return factors.join('_');
  }

  /**
   * Create aggregated demand and notify notaries
   */
  async createAggregatedDemand(groupKey, requests) {
    const aggregation = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      groupKey,
      status: 'OPEN',
      
      // Demand summary
      demand: {
        totalRequests: requests.length,
        category: requests[0].scheduling.category,
        state: requests[0].requirements.state,
        documentTypes: [...new Set(requests.map(r => r.document.type))],
        languages: [...new Set(requests.flatMap(r => r.requirements.languages))],
        estimatedDuration: requests.length * 20 // minutes
      },
      
      // Scheduling
      scheduling: {
        proposedSlots: this.generateProposedSlots(requests),
        deadline: this.calculateDeadline(requests[0].scheduling.category),
        flexibility: this.calculateGroupFlexibility(requests)
      },
      
      // Economics
      economics: {
        totalValue: requests.length * this.notaryNetwork.config.economics.baseNotaryFee,
        perNotarizationFee: this.notaryNetwork.config.economics.baseNotaryFee,
        bulkDiscount: requests.length >= 5 ? 0.9 : 1.0,
        categoryMultiplier: this.config.aggregation.categories[requests[0].scheduling.category].premium
      },
      
      // Bidding
      bidding: {
        open: true,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + this.config.bidding.bidDuration * 60 * 60 * 1000).toISOString(),
        bids: [],
        minimumBid: this.config.bidding.minimumBid * this.notaryNetwork.config.economics.baseNotaryFee
      },
      
      // Requests
      requestIds: requests.map(r => r.id)
    };
    
    this.aggregatedDemand.set(aggregation.id, aggregation);
    
    // Update requests with aggregation ID
    requests.forEach(request => {
      request.aggregation.aggregationId = aggregation.id;
      request.status = 'AGGREGATED';
    });
    
    // Notify eligible notaries
    await this.notifyNotariesOfDemand(aggregation);
    
    this.emit('demandAggregated', {
      aggregationId: aggregation.id,
      totalRequests: aggregation.demand.totalRequests,
      state: aggregation.demand.state,
      totalValue: aggregation.economics.totalValue
    });
    
    return aggregation;
  }

  /**
   * Notify notaries of aggregated demand
   */
  async notifyNotariesOfDemand(aggregation) {
    // Find eligible notaries
    const eligibleNotaries = await this.findEligibleNotariesForAggregation(aggregation);
    
    for (const notary of eligibleNotaries) {
      const notification = {
        type: 'AGGREGATED_DEMAND',
        notaryId: notary.id,
        aggregationId: aggregation.id,
        summary: {
          location: aggregation.demand.state,
          requests: aggregation.demand.totalRequests,
          value: aggregation.economics.totalValue,
          deadline: aggregation.scheduling.deadline,
          documentTypes: aggregation.demand.documentTypes
        },
        action: {
          type: 'BID',
          url: `/notary/bid/${aggregation.id}`,
          deadline: aggregation.bidding.endTime
        }
      };
      
      // Send notification through configured channels
      await this.sendNotification(notary, notification);
      
      // Track notification
      this.emit('notaryNotified', {
        notaryId: notary.id,
        aggregationId: aggregation.id
      });
    }
  }

  /**
   * Notary places bid on aggregated demand
   */
  async placeBid(notaryId, aggregationId, bidData) {
    const aggregation = this.aggregatedDemand.get(aggregationId);
    const notary = this.notaryNetwork.notaries.get(notaryId);
    
    if (!aggregation || !notary) {
      throw new Error('Invalid aggregation or notary');
    }
    
    if (!aggregation.bidding.open) {
      throw new Error('Bidding is closed for this aggregation');
    }
    
    const bid = {
      id: crypto.randomUUID(),
      notaryId,
      aggregationId,
      timestamp: new Date().toISOString(),
      
      // Bid details
      pricing: {
        perNotarization: bidData.pricePerNotarization,
        totalBid: bidData.pricePerNotarization * aggregation.demand.totalRequests,
        bulkDiscount: bidData.bulkDiscount || 0,
        includes: bidData.includes || ['notarization', 'digital_certificate']
      },
      
      // Availability
      availability: {
        proposedSlots: bidData.proposedSlots || aggregation.scheduling.proposedSlots,
        canCompleteBy: bidData.completionDate,
        preferredSchedule: bidData.preferredSchedule
      },
      
      // Notary info
      notaryInfo: {
        name: notary.profile.name,
        reputation: notary.network.reputation,
        completedNotarizations: notary.network.completedNotarizations,
        languages: notary.profile.languages,
        specializations: notary.services.specializations
      },
      
      // Auto-bid settings
      autoBid: bidData.autoBid || {
        enabled: false,
        maxPrice: null,
        minRequests: null
      }
    };
    
    // Validate bid
    if (bid.pricing.perNotarization < aggregation.bidding.minimumBid) {
      throw new Error('Bid below minimum');
    }
    
    // Add bid to aggregation
    aggregation.bidding.bids.push(bid);
    this.activeBids.set(bid.id, bid);
    
    this.emit('bidPlaced', {
      bidId: bid.id,
      notaryId,
      aggregationId,
      totalBid: bid.pricing.totalBid
    });
    
    return bid;
  }

  /**
   * Select winning bid and create appointments
   */
  async selectWinningBid(aggregationId) {
    const aggregation = this.aggregatedDemand.get(aggregationId);
    if (!aggregation) {
      throw new Error('Aggregation not found');
    }
    
    // Close bidding
    aggregation.bidding.open = false;
    
    // Score and rank bids
    const scoredBids = aggregation.bidding.bids.map(bid => ({
      bid,
      score: this.scoreBid(bid, aggregation)
    }));
    
    // Sort by score descending
    scoredBids.sort((a, b) => b.score - a.score);
    
    if (scoredBids.length === 0) {
      aggregation.status = 'NO_BIDS';
      return null;
    }
    
    // Select winner
    const winner = scoredBids[0];
    aggregation.winningBid = winner.bid.id;
    aggregation.status = 'AWARDED';
    
    // Create appointments
    const appointments = await this.createAppointmentsFromAggregation(
      aggregation,
      winner.bid
    );
    
    // Notify winner and losers
    await this.notifyBidResults(aggregation, winner.bid);
    
    this.emit('bidAwarded', {
      aggregationId,
      winningBidId: winner.bid.id,
      notaryId: winner.bid.notaryId,
      appointments: appointments.map(a => a.id)
    });
    
    return {
      winningBid: winner.bid,
      appointments
    };
  }

  /**
   * Score a bid based on multiple factors
   */
  scoreBid(bid, aggregation) {
    let score = 0;
    
    // Price factor (40%)
    const priceScore = (aggregation.economics.perNotarizationFee / bid.pricing.perNotarization) * 0.4;
    score += Math.min(priceScore, 0.4);
    
    // Reputation factor (30%)
    const reputationScore = (bid.notaryInfo.reputation / 100) * 0.3;
    score += reputationScore;
    
    // Experience factor (20%)
    const experienceScore = Math.min(bid.notaryInfo.completedNotarizations / 100, 1) * 0.2;
    score += experienceScore;
    
    // Availability factor (10%)
    const availabilityScore = this.scoreAvailability(bid.availability, aggregation.scheduling) * 0.1;
    score += availabilityScore;
    
    return score;
  }

  /**
   * Create appointments from winning bid
   */
  async createAppointmentsFromAggregation(aggregation, winningBid) {
    const appointments = [];
    const requests = aggregation.requestIds.map(id => 
      Array.from(this.demandQueue.values()).flat().find(r => r.id === id)
    ).filter(Boolean);
    
    // Group requests into appointment slots
    const slots = this.optimizeAppointmentSlots(requests, winningBid.availability.proposedSlots);
    
    for (const slot of slots) {
      const appointment = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        status: 'SCHEDULED',
        
        // Appointment details
        details: {
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: slot.duration,
          timezone: slot.timezone
        },
        
        // Participants
        participants: {
          notaryId: winningBid.notaryId,
          requestIds: slot.requestIds,
          requesterEmails: slot.requesterEmails
        },
        
        // From aggregation
        aggregation: {
          aggregationId: aggregation.id,
          bidId: winningBid.id,
          groupKey: aggregation.groupKey
        },
        
        // Meeting details
        meeting: {
          type: 'REMOTE', // REMOTE | IN_PERSON | HYBRID
          platform: 'ChittyChain Notary Platform',
          joinUrl: null, // Generated when appointment is confirmed
          recordingEnabled: true
        },
        
        // Economics
        pricing: {
          perNotarization: winningBid.pricing.perNotarization,
          totalFee: winningBid.pricing.perNotarization * slot.requestIds.length,
          paid: false
        }
      };
      
      appointments.push(appointment);
      this.appointments.set(appointment.id, appointment);
      
      // Update notary schedule
      await this.updateNotarySchedule(winningBid.notaryId, appointment);
      
      // Update request statuses
      slot.requestIds.forEach(requestId => {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          request.status = 'SCHEDULED';
          request.appointmentId = appointment.id;
        }
      });
    }
    
    return appointments;
  }

  /**
   * Optimize appointment slots for efficiency
   */
  optimizeAppointmentSlots(requests, proposedSlots) {
    const slots = [];
    const maxPerSlot = this.config.scheduling.maxNotarizationsPerSession;
    
    // Group requests that can be done together
    let currentSlot = {
      ...proposedSlots[0],
      requestIds: [],
      requesterEmails: []
    };
    
    requests.forEach(request => {
      if (currentSlot.requestIds.length < maxPerSlot) {
        currentSlot.requestIds.push(request.id);
        currentSlot.requesterEmails.push(request.requester.email);
      } else {
        slots.push(currentSlot);
        currentSlot = {
          ...proposedSlots[slots.length],
          requestIds: [request.id],
          requesterEmails: [request.requester.email]
        };
      }
    });
    
    if (currentSlot.requestIds.length > 0) {
      slots.push(currentSlot);
    }
    
    return slots;
  }

  /**
   * User selects available time slot
   */
  async selectTimeSlot(userId, notaryId, slotData) {
    const notarySchedule = this.notarySchedules.get(notaryId);
    if (!notarySchedule) {
      throw new Error('Notary schedule not found');
    }
    
    // Check slot availability
    const isAvailable = this.checkSlotAvailability(notarySchedule, slotData);
    if (!isAvailable) {
      throw new Error('Selected time slot is not available');
    }
    
    // Create individual appointment
    const appointment = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      status: 'SCHEDULED',
      
      details: {
        date: slotData.date,
        startTime: slotData.startTime,
        endTime: slotData.endTime,
        duration: this.config.scheduling.appointmentSlots,
        timezone: slotData.timezone
      },
      
      participants: {
        notaryId,
        userId,
        requestId: slotData.requestId
      },
      
      meeting: {
        type: 'REMOTE',
        platform: 'ChittyChain Notary Platform',
        joinUrl: null
      },
      
      pricing: {
        fee: this.notaryNetwork.config.economics.baseNotaryFee,
        paid: false
      }
    };
    
    this.appointments.set(appointment.id, appointment);
    await this.updateNotarySchedule(notaryId, appointment);
    
    this.emit('appointmentScheduled', {
      appointmentId: appointment.id,
      notaryId,
      userId,
      dateTime: `${appointment.details.date} ${appointment.details.startTime}`
    });
    
    return appointment;
  }

  /**
   * Get available notaries and their schedules
   */
  async getAvailableNotaries(criteria) {
    const availableNotaries = [];
    
    for (const [notaryId, notary] of this.notaryNetwork.notaries) {
      if (notary.status !== 'ACTIVE') continue;
      if (notary.credentials.state !== criteria.state) continue;
      
      const schedule = this.notarySchedules.get(notaryId);
      const availableSlots = this.getAvailableSlots(schedule, criteria.dateRange);
      
      if (availableSlots.length > 0) {
        availableNotaries.push({
          notary: {
            id: notaryId,
            name: notary.profile.name,
            reputation: notary.network.reputation,
            fee: notary.services.pricing || this.notaryNetwork.config.economics.baseNotaryFee
          },
          availableSlots,
          nextAvailable: availableSlots[0]
        });
      }
    }
    
    return availableNotaries;
  }

  /**
   * Initialize notary schedule
   */
  initializeNotarySchedule(notaryId) {
    const schedule = {
      notaryId,
      availability: {
        monday: { available: true, hours: { start: 9, end: 17 } },
        tuesday: { available: true, hours: { start: 9, end: 17 } },
        wednesday: { available: true, hours: { start: 9, end: 17 } },
        thursday: { available: true, hours: { start: 9, end: 17 } },
        friday: { available: true, hours: { start: 9, end: 17 } },
        saturday: { available: false },
        sunday: { available: false }
      },
      appointments: [],
      blockedDates: [],
      preferences: {
        minNotarizationsPerSession: 2,
        maxNotarizationsPerDay: 20,
        breakBetweenSessions: 15 // minutes
      }
    };
    
    this.notarySchedules.set(notaryId, schedule);
  }

  /**
   * Update notary schedule with appointment
   */
  async updateNotarySchedule(notaryId, appointment) {
    const schedule = this.notarySchedules.get(notaryId);
    if (!schedule) return;
    
    schedule.appointments.push({
      appointmentId: appointment.id,
      date: appointment.details.date,
      startTime: appointment.details.startTime,
      endTime: appointment.details.endTime
    });
    
    // Sort appointments by date/time
    schedule.appointments.sort((a, b) => 
      new Date(`${a.date} ${a.startTime}`) - new Date(`${b.date} ${b.startTime}`)
    );
  }

  /**
   * Get aggregation window for category
   */
  getAggregationWindow(category) {
    return this.config.aggregation.categories[category]?.window || 24;
  }

  /**
   * Generate proposed time slots
   */
  generateProposedSlots(requests) {
    // Analyze request preferences
    const preferredDates = requests.flatMap(r => r.scheduling.preferredDates);
    const preferredTimes = requests.flatMap(r => r.scheduling.preferredTimes);
    
    // Generate slots based on preferences and availability
    const slots = [];
    const startDate = new Date();
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      if (this.isBusinessDay(date)) {
        slots.push({
          date: date.toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '11:30',
          duration: 90,
          timezone: 'America/Los_Angeles'
        });
        
        slots.push({
          date: date.toISOString().split('T')[0],
          startTime: '14:00',
          endTime: '15:30',
          duration: 90,
          timezone: 'America/Los_Angeles'
        });
      }
    }
    
    return slots;
  }

  /**
   * Check if date is a business day
   */
  isBusinessDay(date) {
    const day = date.getDay();
    return day !== 0 && day !== 6; // Not Sunday or Saturday
  }

  /**
   * Calculate deadline based on category
   */
  calculateDeadline(category) {
    const window = this.getAggregationWindow(category);
    return new Date(Date.now() + window * 60 * 60 * 1000).toISOString();
  }

  /**
   * Calculate group flexibility
   */
  calculateGroupFlexibility(requests) {
    const flexibilities = requests.map(r => r.scheduling.flexibility);
    const flexibleCount = flexibilities.filter(f => f === 'FLEXIBLE').length;
    return flexibleCount / requests.length;
  }

  /**
   * Find eligible notaries for aggregation
   */
  async findEligibleNotariesForAggregation(aggregation) {
    const eligible = [];
    
    for (const [notaryId, notary] of this.notaryNetwork.notaries) {
      if (notary.status !== 'ACTIVE') continue;
      if (notary.credentials.state !== aggregation.demand.state) continue;
      
      // Check language support
      const hasRequiredLanguages = aggregation.demand.languages.every(lang =>
        notary.profile.languages.includes(lang)
      );
      if (!hasRequiredLanguages) continue;
      
      eligible.push(notary);
    }
    
    return eligible;
  }

  /**
   * Send notification to notary
   */
  async sendNotification(notary, notification) {
    // In production, this would integrate with email/SMS services
    console.log(`Notifying ${notary.profile.name}:`, notification);
    
    this.emit('notificationSent', {
      notaryId: notary.id,
      type: notification.type,
      channel: 'email' // Would be dynamic based on preferences
    });
  }

  /**
   * Start aggregation timer
   */
  startAggregationTimer() {
    setInterval(() => {
      this.checkAllAggregationTriggers();
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Check all categories for aggregation triggers
   */
  async checkAllAggregationTriggers() {
    for (const category of Object.keys(this.config.aggregation.categories)) {
      await this.checkAggregationTriggers(category);
    }
  }

  /**
   * Get scheduler statistics
   */
  getSchedulerStats() {
    const queuedRequests = Array.from(this.demandQueue.values()).flat().length;
    const activeAggregations = Array.from(this.aggregatedDemand.values())
      .filter(a => a.status === 'OPEN').length;
    const scheduledAppointments = Array.from(this.appointments.values())
      .filter(a => a.status === 'SCHEDULED').length;
    
    return {
      mode: this.config.scheduling.mode,
      queue: {
        total: queuedRequests,
        byCategory: Object.fromEntries(
          Array.from(this.demandQueue.entries()).map(([cat, reqs]) => [cat, reqs.length])
        )
      },
      aggregations: {
        active: activeAggregations,
        total: this.aggregatedDemand.size
      },
      appointments: {
        scheduled: scheduledAppointments,
        total: this.appointments.size
      },
      bidding: {
        activeBids: this.activeBids.size
      }
    };
  }
}

// Export for use
export default ChittyChainNotaryScheduler;