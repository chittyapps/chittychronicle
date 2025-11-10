#!/usr/bin/env node

/**
 * ChittyChain Notary Marketplace - Appointment-Based Notary Network
 * 
 * Handles initial availability challenges by aggregating demand,
 * enabling appointment scheduling, and allowing notaries to bid on jobs.
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

export class ChittyChainNotaryMarketplace extends EventEmitter {
  constructor(notaryNetwork, config = {}) {
    super();
    this.notaryNetwork = notaryNetwork;
    this.config = {
      // Marketplace settings
      aggregationPeriod: 24 * 60 * 60 * 1000, // 24 hours
      minBundleSize: 3, // Minimum docs to create a bundle
      maxBundleSize: 10, // Maximum docs in one appointment
      
      // Appointment settings
      appointmentSlots: {
        duration: 30, // minutes per document
        bufferTime: 15, // minutes between appointments
        workingHours: {
          start: 9, // 9 AM
          end: 17, // 5 PM
          timezone: 'America/Los_Angeles'
        }
      },
      
      // Bidding settings
      bidding: {
        windowDuration: 4 * 60 * 60 * 1000, // 4 hours
        minBids: 3, // Minimum bids before auto-selection
        maxBids: 10, // Maximum bids to consider
        autoBidThreshold: 0.8 // Auto-accept if score > threshold
      },
      
      // Matching weights
      matchingWeights: {
        location: 0.3,
        availability: 0.25,
        specialization: 0.2,
        price: 0.15,
        rating: 0.1
      },
      
      ...config
    };
    
    // Marketplace state
    this.aggregationQueue = new Map(); // userId -> pending documents
    this.notarizationBundles = new Map(); // bundleId -> bundle
    this.appointmentSlots = new Map(); // notaryId -> available slots
    this.activeBiddings = new Map(); // bundleId -> bidding session
    this.bookings = new Map(); // bookingId -> appointment
    this.userPreferences = new Map(); // userId -> preferences
    
    // Start aggregation timer
    this.startAggregationService();
  }

  /**
   * Start automatic aggregation service
   */
  startAggregationService() {
    // Run aggregation every hour
    this.aggregationInterval = setInterval(() => {
      this.processAggregationQueue();
    }, 60 * 60 * 1000);
    
    this.emit('marketplaceStarted', {
      aggregationEnabled: true,
      interval: '1 hour'
    });
  }

  /**
   * Add document to aggregation queue
   */
  async addToAggregationQueue(userId, document) {
    if (!this.aggregationQueue.has(userId)) {
      this.aggregationQueue.set(userId, {
        userId,
        documents: [],
        firstAdded: Date.now(),
        preferences: this.userPreferences.get(userId) || {}
      });
    }
    
    const userQueue = this.aggregationQueue.get(userId);
    userQueue.documents.push({
      id: document.id,
      type: document.type,
      urgency: document.urgency || 'STANDARD',
      addedAt: Date.now(),
      estimatedDuration: this.estimateNotarizationDuration(document),
      requirements: {
        witnesses: document.requiresWitnesses || false,
        language: document.language || 'English',
        specialization: document.specialization
      }
    });
    
    // Check if we should trigger immediate processing
    if (userQueue.documents.length >= this.config.maxBundleSize ||
        this.hasUrgentDocuments(userQueue.documents)) {
      await this.processUserQueue(userId);
    }
    
    this.emit('documentQueued', {
      userId,
      documentId: document.id,
      queueSize: userQueue.documents.length
    });
    
    return {
      queued: true,
      queueSize: userQueue.documents.length,
      estimatedProcessing: this.getEstimatedProcessingTime(userQueue)
    };
  }

  /**
   * Process aggregation queue
   */
  async processAggregationQueue() {
    const now = Date.now();
    const processedUsers = [];
    
    for (const [userId, queue] of this.aggregationQueue) {
      // Process if enough time has passed or minimum size reached
      const timeSinceFirst = now - queue.firstAdded;
      if (timeSinceFirst >= this.config.aggregationPeriod ||
          queue.documents.length >= this.config.minBundleSize) {
        await this.processUserQueue(userId);
        processedUsers.push(userId);
      }
    }
    
    // Clean up processed queues
    processedUsers.forEach(userId => this.aggregationQueue.delete(userId));
    
    this.emit('aggregationProcessed', {
      usersProcessed: processedUsers.length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Process individual user queue
   */
  async processUserQueue(userId) {
    const queue = this.aggregationQueue.get(userId);
    if (!queue || queue.documents.length === 0) return;
    
    // Create notarization bundle
    const bundle = {
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
      status: 'PENDING_MATCH',
      
      // Bundle details
      documents: queue.documents,
      totalDocuments: queue.documents.length,
      estimatedDuration: queue.documents.reduce((sum, doc) => sum + doc.estimatedDuration, 0),
      
      // Requirements aggregation
      requirements: {
        states: this.aggregateStates(queue.documents),
        languages: this.aggregateLanguages(queue.documents),
        specializations: this.aggregateSpecializations(queue.documents),
        witnessesNeeded: queue.documents.some(d => d.requirements.witnesses),
        urgency: this.determineUrgency(queue.documents)
      },
      
      // User preferences
      preferences: {
        preferredTimes: queue.preferences.preferredTimes || [],
        maxPrice: queue.preferences.maxPrice,
        preferredNotaries: queue.preferences.preferredNotaries || [],
        location: queue.preferences.location
      },
      
      // Matching/bidding
      matching: {
        method: this.determineMatchingMethod(queue),
        eligibleNotaries: [],
        bids: [],
        selectedNotary: null
      }
    };
    
    this.notarizationBundles.set(bundle.id, bundle);
    
    // Start matching process
    if (bundle.matching.method === 'BIDDING') {
      await this.startBiddingProcess(bundle);
    } else {
      await this.startDirectMatching(bundle);
    }
    
    // Notify user
    this.emit('bundleCreated', {
      bundleId: bundle.id,
      userId,
      documentCount: bundle.totalDocuments,
      method: bundle.matching.method
    });
    
    return bundle;
  }

  /**
   * Start bidding process for bundle
   */
  async startBiddingProcess(bundle) {
    // Find eligible notaries
    const eligibleNotaries = await this.findEligibleNotariesForBundle(bundle);
    bundle.matching.eligibleNotaries = eligibleNotaries.map(n => n.id);
    
    // Create bidding session
    const biddingSession = {
      bundleId: bundle.id,
      startTime: Date.now(),
      endTime: Date.now() + this.config.bidding.windowDuration,
      bids: [],
      status: 'ACTIVE',
      notifiedNotaries: eligibleNotaries.map(n => n.id)
    };
    
    this.activeBiddings.set(bundle.id, biddingSession);
    
    // Notify eligible notaries
    eligibleNotaries.forEach(notary => {
      this.emit('biddingOpportunity', {
        notaryId: notary.id,
        bundleId: bundle.id,
        documentCount: bundle.totalDocuments,
        estimatedDuration: bundle.estimatedDuration,
        requirements: bundle.requirements,
        biddingDeadline: new Date(biddingSession.endTime).toISOString()
      });
    });
    
    // Set timer to close bidding
    setTimeout(() => {
      this.closeBidding(bundle.id);
    }, this.config.bidding.windowDuration);
    
    bundle.status = 'BIDDING_ACTIVE';
  }

  /**
   * Submit bid from notary
   */
  async submitBid(notaryId, bundleId, bidData) {
    const bundle = this.notarizationBundles.get(bundleId);
    const biddingSession = this.activeBiddings.get(bundleId);
    const notary = this.notaryNetwork.notaries.get(notaryId);
    
    if (!bundle || !biddingSession || !notary) {
      throw new Error('Invalid bid submission');
    }
    
    if (biddingSession.status !== 'ACTIVE') {
      throw new Error('Bidding session is closed');
    }
    
    const bid = {
      id: crypto.randomUUID(),
      notaryId,
      bundleId,
      timestamp: Date.now(),
      
      // Bid details
      pricing: {
        totalPrice: bidData.price,
        pricePerDocument: bidData.price / bundle.totalDocuments,
        currency: 'USD'
      },
      
      // Availability
      availability: {
        proposedSlots: bidData.availableSlots || [],
        earliestAvailable: bidData.earliestAvailable,
        canCompleteBy: bidData.completionDate
      },
      
      // Service details
      service: {
        includesTravel: bidData.includesTravel || false,
        witnessesAvailable: bidData.hasWitnesses || false,
        languages: notary.profile.languages,
        specializations: notary.services.specializations
      },
      
      // Message to user
      message: bidData.message,
      
      // Scoring
      score: 0
    };
    
    // Calculate bid score
    bid.score = this.calculateBidScore(bid, bundle, notary);
    
    // Add bid to session
    biddingSession.bids.push(bid);
    bundle.matching.bids.push({
      bidId: bid.id,
      notaryId: bid.notaryId,
      price: bid.pricing.totalPrice,
      score: bid.score
    });
    
    // Check for auto-acceptance
    if (bid.score >= this.config.bidding.autoBidThreshold) {
      await this.acceptBid(bundleId, bid.id);
    }
    
    this.emit('bidSubmitted', {
      bidId: bid.id,
      bundleId,
      notaryId,
      score: bid.score
    });
    
    return bid;
  }

  /**
   * Close bidding and select winner
   */
  async closeBidding(bundleId) {
    const biddingSession = this.activeBiddings.get(bundleId);
    const bundle = this.notarizationBundles.get(bundleId);
    
    if (!biddingSession || !bundle) return;
    
    biddingSession.status = 'CLOSED';
    
    // Sort bids by score
    const sortedBids = biddingSession.bids.sort((a, b) => b.score - a.score);
    
    if (sortedBids.length > 0) {
      // Select winning bid
      const winningBid = sortedBids[0];
      await this.acceptBid(bundleId, winningBid.id);
    } else {
      // No bids received, switch to direct matching
      bundle.matching.method = 'DIRECT_MATCH';
      await this.startDirectMatching(bundle);
    }
    
    this.emit('biddingClosed', {
      bundleId,
      totalBids: sortedBids.length,
      winningBid: sortedBids[0]?.id
    });
  }

  /**
   * Accept a bid
   */
  async acceptBid(bundleId, bidId) {
    const bundle = this.notarizationBundles.get(bundleId);
    const biddingSession = this.activeBiddings.get(bundleId);
    const bid = biddingSession.bids.find(b => b.id === bidId);
    
    if (!bundle || !bid) {
      throw new Error('Invalid bid acceptance');
    }
    
    // Create booking
    const booking = await this.createBooking(bundle, bid);
    
    // Update bundle
    bundle.status = 'MATCHED';
    bundle.matching.selectedNotary = bid.notaryId;
    bundle.bookingId = booking.id;
    
    // Close bidding
    biddingSession.status = 'COMPLETED';
    
    // Notify parties
    this.emit('bidAccepted', {
      bundleId,
      bidId,
      notaryId: bid.notaryId,
      bookingId: booking.id
    });
    
    return booking;
  }

  /**
   * Start direct matching (calendar-based)
   */
  async startDirectMatching(bundle) {
    // Find eligible notaries with available slots
    const eligibleNotaries = await this.findEligibleNotariesForBundle(bundle);
    const notariesWithSlots = [];
    
    for (const notary of eligibleNotaries) {
      const availableSlots = await this.getAvailableSlots(
        notary.id, 
        bundle.estimatedDuration
      );
      
      if (availableSlots.length > 0) {
        notariesWithSlots.push({
          notary,
          slots: availableSlots,
          matchScore: this.calculateMatchScore(notary, bundle)
        });
      }
    }
    
    // Sort by match score
    notariesWithSlots.sort((a, b) => b.matchScore - a.matchScore);
    
    // Present options to user
    bundle.matching.availableOptions = notariesWithSlots.map(option => ({
      notaryId: option.notary.id,
      notaryName: option.notary.profile.name,
      rating: option.notary.network.reputation,
      price: option.notary.services.pricing * bundle.totalDocuments,
      availableSlots: option.slots,
      matchScore: option.matchScore
    }));
    
    bundle.status = 'AWAITING_SELECTION';
    
    this.emit('matchingComplete', {
      bundleId: bundle.id,
      optionsCount: notariesWithSlots.length
    });
    
    return bundle.matching.availableOptions;
  }

  /**
   * User selects appointment slot
   */
  async selectAppointment(bundleId, notaryId, slotId) {
    const bundle = this.notarizationBundles.get(bundleId);
    const slot = this.getSlotDetails(notaryId, slotId);
    
    if (!bundle || !slot) {
      throw new Error('Invalid appointment selection');
    }
    
    // Create pseudo-bid for booking creation
    const appointmentBid = {
      notaryId,
      bundleId,
      pricing: {
        totalPrice: this.calculateAppointmentPrice(notaryId, bundle)
      },
      availability: {
        proposedSlots: [slot],
        earliestAvailable: slot.startTime
      }
    };
    
    // Create booking
    const booking = await this.createBooking(bundle, appointmentBid);
    
    // Update bundle
    bundle.status = 'BOOKED';
    bundle.matching.selectedNotary = notaryId;
    bundle.bookingId = booking.id;
    
    this.emit('appointmentBooked', {
      bundleId,
      notaryId,
      bookingId: booking.id,
      appointmentTime: slot.startTime
    });
    
    return booking;
  }

  /**
   * Create booking from bid or appointment
   */
  async createBooking(bundle, bidOrAppointment) {
    const booking = {
      id: crypto.randomUUID(),
      bundleId: bundle.id,
      userId: bundle.userId,
      notaryId: bidOrAppointment.notaryId,
      createdAt: new Date().toISOString(),
      status: 'CONFIRMED',
      
      // Appointment details
      appointment: {
        startTime: bidOrAppointment.availability.proposedSlots[0]?.startTime,
        endTime: bidOrAppointment.availability.proposedSlots[0]?.endTime,
        duration: bundle.estimatedDuration,
        location: 'REMOTE', // or physical address
        method: bundle.requirements.witnessesNeeded ? 'IN_PERSON' : 'REMOTE'
      },
      
      // Documents
      documents: bundle.documents,
      
      // Pricing
      pricing: {
        total: bidOrAppointment.pricing.totalPrice,
        breakdown: {
          base: bidOrAppointment.pricing.totalPrice * 0.8,
          platformFee: bidOrAppointment.pricing.totalPrice * 0.15,
          processingFee: bidOrAppointment.pricing.totalPrice * 0.05
        }
      },
      
      // Reminders
      reminders: [
        { type: 'EMAIL', timing: '24_HOURS_BEFORE' },
        { type: 'SMS', timing: '2_HOURS_BEFORE' },
        { type: 'PUSH', timing: '30_MINUTES_BEFORE' }
      ]
    };
    
    this.bookings.set(booking.id, booking);
    
    // Update notary availability
    await this.blockNotarySlot(
      booking.notaryId, 
      booking.appointment.startTime,
      booking.appointment.endTime
    );
    
    // Create calendar events
    this.emit('createCalendarEvents', {
      bookingId: booking.id,
      userId: booking.userId,
      notaryId: booking.notaryId,
      appointment: booking.appointment
    });
    
    return booking;
  }

  /**
   * Get available appointment slots for notary
   */
  async getAvailableSlots(notaryId, duration) {
    const notarySlots = this.appointmentSlots.get(notaryId) || [];
    const availableSlots = [];
    
    // Generate slots for next 14 days
    const now = new Date();
    for (let day = 0; day < 14; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      
      // Skip weekends if configured
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      // Generate time slots for the day
      const daySlots = this.generateDaySlots(date, duration);
      
      // Check against notary's existing bookings
      const freeSlots = daySlots.filter(slot => 
        this.isSlotAvailable(notaryId, slot, notarySlots)
      );
      
      availableSlots.push(...freeSlots);
    }
    
    return availableSlots.slice(0, 20); // Return max 20 slots
  }

  /**
   * Calculate bid score
   */
  calculateBidScore(bid, bundle, notary) {
    const weights = this.config.matchingWeights;
    let score = 0;
    
    // Price score (lower is better)
    const avgPrice = this.getAveragePrice(bundle);
    const priceRatio = avgPrice / bid.pricing.totalPrice;
    score += weights.price * Math.min(priceRatio, 1);
    
    // Availability score (sooner is better)
    const urgencyMultiplier = bundle.requirements.urgency === 'URGENT' ? 2 : 1;
    const hoursUntilAvailable = (new Date(bid.availability.earliestAvailable) - Date.now()) / (1000 * 60 * 60);
    const availabilityScore = Math.max(0, 1 - (hoursUntilAvailable / (24 * urgencyMultiplier)));
    score += weights.availability * availabilityScore;
    
    // Specialization match
    const specializationMatch = this.calculateSpecializationMatch(notary, bundle);
    score += weights.specialization * specializationMatch;
    
    // Rating
    const ratingScore = notary.network.reputation / 100;
    score += weights.rating * ratingScore;
    
    // Location (for in-person)
    if (bundle.requirements.witnessesNeeded) {
      const locationScore = this.calculateLocationScore(notary, bundle);
      score += weights.location * locationScore;
    } else {
      score += weights.location; // Full score for remote
    }
    
    return score;
  }

  /**
   * Calculate match score for direct matching
   */
  calculateMatchScore(notary, bundle) {
    // Similar to bid score but without price consideration
    return this.calculateBidScore(
      { pricing: { totalPrice: this.getAveragePrice(bundle) } },
      bundle,
      notary
    );
  }

  // Helper methods
  estimateNotarizationDuration(document) {
    const baseDuration = this.config.appointmentSlots.duration;
    const complexity = document.complexity || 1;
    return baseDuration * complexity;
  }

  hasUrgentDocuments(documents) {
    return documents.some(doc => doc.urgency === 'URGENT');
  }

  determineUrgency(documents) {
    if (documents.some(doc => doc.urgency === 'URGENT')) return 'URGENT';
    if (documents.some(doc => doc.urgency === 'PRIORITY')) return 'PRIORITY';
    return 'STANDARD';
  }

  determineMatchingMethod(queue) {
    // Use bidding for complex or high-value bundles
    if (queue.documents.length >= 5 || 
        this.hasSpecialRequirements(queue.documents)) {
      return 'BIDDING';
    }
    return 'DIRECT_MATCH';
  }

  hasSpecialRequirements(documents) {
    return documents.some(doc => 
      doc.requirements.witnesses || 
      doc.requirements.specialization ||
      doc.requirements.language !== 'English'
    );
  }

  aggregateStates(documents) {
    // Implementation would determine required states based on documents
    return ['CA']; // Placeholder
  }

  aggregateLanguages(documents) {
    const languages = new Set();
    documents.forEach(doc => languages.add(doc.requirements.language));
    return Array.from(languages);
  }

  aggregateSpecializations(documents) {
    const specializations = new Set();
    documents.forEach(doc => {
      if (doc.requirements.specialization) {
        specializations.add(doc.requirements.specialization);
      }
    });
    return Array.from(specializations);
  }

  async findEligibleNotariesForBundle(bundle) {
    const eligibleNotaries = [];
    
    for (const [notaryId, notary] of this.notaryNetwork.notaries) {
      if (notary.status !== 'ACTIVE') continue;
      
      // Check state requirements
      if (!bundle.requirements.states.includes(notary.credentials.state)) continue;
      
      // Check language requirements
      const hasRequiredLanguages = bundle.requirements.languages.every(lang =>
        notary.profile.languages.includes(lang)
      );
      if (!hasRequiredLanguages) continue;
      
      // Check specialization requirements
      if (bundle.requirements.specializations.length > 0) {
        const hasSpecialization = bundle.requirements.specializations.some(spec =>
          notary.services.specializations.includes(spec)
        );
        if (!hasSpecialization) continue;
      }
      
      eligibleNotaries.push(notary);
    }
    
    return eligibleNotaries;
  }

  generateDaySlots(date, duration) {
    const slots = [];
    const workStart = new Date(date);
    workStart.setHours(this.config.appointmentSlots.workingHours.start, 0, 0, 0);
    
    const workEnd = new Date(date);
    workEnd.setHours(this.config.appointmentSlots.workingHours.end, 0, 0, 0);
    
    let currentTime = new Date(workStart);
    
    while (currentTime < workEnd) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60 * 1000);
      
      if (slotEnd <= workEnd) {
        slots.push({
          id: crypto.randomUUID(),
          startTime: currentTime.toISOString(),
          endTime: slotEnd.toISOString(),
          duration: duration
        });
      }
      
      // Move to next slot with buffer
      currentTime = new Date(slotEnd.getTime() + this.config.appointmentSlots.bufferTime * 60 * 1000);
    }
    
    return slots;
  }

  isSlotAvailable(notaryId, slot, existingBookings) {
    // Check if slot conflicts with existing bookings
    return !existingBookings.some(booking => {
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);
      
      return (slotStart < bookingEnd && slotEnd > bookingStart);
    });
  }

  getAveragePrice(bundle) {
    // Calculate average market price for this type of bundle
    return this.notaryNetwork.config.economics.baseNotaryFee * bundle.totalDocuments;
  }

  calculateSpecializationMatch(notary, bundle) {
    if (bundle.requirements.specializations.length === 0) return 1;
    
    const matches = bundle.requirements.specializations.filter(spec =>
      notary.services.specializations.includes(spec)
    );
    
    return matches.length / bundle.requirements.specializations.length;
  }

  calculateLocationScore(notary, bundle) {
    // Simplified location scoring - in production would use real distance calculation
    if (bundle.preferences.location && notary.services.serviceAreas.includes(bundle.preferences.location)) {
      return 1;
    }
    return 0.5;
  }

  getSlotDetails(notaryId, slotId) {
    // Retrieve slot details from available slots
    const notarySlots = this.appointmentSlots.get(notaryId) || [];
    return notarySlots.find(slot => slot.id === slotId);
  }

  calculateAppointmentPrice(notaryId, bundle) {
    const notary = this.notaryNetwork.notaries.get(notaryId);
    const basePrice = notary.services.pricing || this.notaryNetwork.config.economics.baseNotaryFee;
    return basePrice * bundle.totalDocuments;
  }

  async blockNotarySlot(notaryId, startTime, endTime) {
    const notarySlots = this.appointmentSlots.get(notaryId) || [];
    notarySlots.push({
      startTime,
      endTime,
      status: 'BOOKED'
    });
    this.appointmentSlots.set(notaryId, notarySlots);
  }

  /**
   * Get marketplace statistics
   */
  getMarketplaceStats() {
    return {
      aggregation: {
        queuedUsers: this.aggregationQueue.size,
        totalQueuedDocuments: Array.from(this.aggregationQueue.values())
          .reduce((sum, queue) => sum + queue.documents.length, 0)
      },
      bundles: {
        total: this.notarizationBundles.size,
        pending: Array.from(this.notarizationBundles.values())
          .filter(b => b.status === 'PENDING_MATCH').length,
        active: Array.from(this.notarizationBundles.values())
          .filter(b => ['BIDDING_ACTIVE', 'AWAITING_SELECTION'].includes(b.status)).length,
        completed: Array.from(this.notarizationBundles.values())
          .filter(b => ['MATCHED', 'BOOKED'].includes(b.status)).length
      },
      bidding: {
        activeSessions: this.activeBiddings.size,
        totalBids: Array.from(this.activeBiddings.values())
          .reduce((sum, session) => sum + session.bids.length, 0)
      },
      bookings: {
        total: this.bookings.size,
        upcoming: Array.from(this.bookings.values())
          .filter(b => new Date(b.appointment.startTime) > new Date()).length
      }
    };
  }
}

// Export for use
export default ChittyChainNotaryMarketplace;