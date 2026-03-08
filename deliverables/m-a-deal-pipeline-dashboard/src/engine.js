/**
 * M&A Deal Pipeline Engine
 * Tracks all active M&A deals with stage, dates, blockers, and DD status
 */

import { v4 as uuid } from 'uuid';
import { differenceInDays } from 'date-fns';

export class DealPipeline {
  constructor() {
    this.deals = [];
    this.createdAt = new Date();
  }

  /**
   * Add M&A deal
   */
  addDeal(name, details = {}) {
    const deal = {
      id: uuid(),
      name,
      stage: details.stage || 'prospecting', // prospecting, initial-contact, due-diligence, negotiation, closing, closed, dead
      stageOrder: this._getStageOrder(details.stage || 'prospecting'),
      target: {
        name: details.targetName || null,
        industry: details.industry || null,
        revenue: details.revenue || null,
        description: details.description || null
      },
      dates: {
        identified: details.identified || new Date().toISOString(),
        firstContact: details.firstContact || null,
        dueDiligenceStart: details.dueDiligenceStart || null,
        dueDiligenceEnd: details.dueDiligenceEnd || null,
        expectedClose: details.expectedClose || null,
        actualClose: details.actualClose || null
      },
      team: {
        lead: details.lead || null,
        advisors: details.advisors || []
      },
      dueDiligence: {
        status: details.ddStatus || 'not-started', // not-started, in-progress, complete, issues
        items: details.ddItems || [],
        completionPercentage: 0
      },
      financials: {
        targetPrice: details.targetPrice || null,
        earnouts: details.earnouts || null,
        synergies: details.synergies || null,
        roiEstimate: details.roiEstimate || null
      },
      blockers: [],
      nextActions: [],
      notes: details.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.deals.push(deal);
    return deal;
  }

  /**
   * Update deal stage
   */
  updateStage(dealId, newStage) {
    const deal = this._getDeal(dealId);
    deal.stage = newStage;
    deal.stageOrder = this._getStageOrder(newStage);
    deal.updatedAt = new Date();
    return deal;
  }

  /**
   * Add blocker to deal
   */
  addBlocker(dealId, description, details = {}) {
    const deal = this._getDeal(dealId);
    const blocker = {
      id: uuid(),
      description,
      severity: details.severity || 'medium', // low, medium, high, critical
      owner: details.owner || null,
      dueDate: details.dueDate || null,
      status: details.status || 'open', // open, in-progress, resolved
      createdAt: new Date()
    };

    deal.blockers.push(blocker);
    deal.updatedAt = new Date();
    return blocker;
  }

  /**
   * Add next action
   */
  addAction(dealId, description, details = {}) {
    const deal = this._getDeal(dealId);
    const action = {
      id: uuid(),
      description,
      dueDate: details.dueDate || null,
      owner: details.owner || null,
      priority: details.priority || 'medium',
      status: details.status || 'open', // open, in-progress, complete
      createdAt: new Date()
    };

    deal.nextActions.push(action);
    deal.updatedAt = new Date();
    return action;
  }

  /**
   * Update due diligence
   */
  updateDueDiligence(dealId, items) {
    const deal = this._getDeal(dealId);
    deal.dueDiligence.items = items;
    deal.dueDiligence.completionPercentage = this._calculateDDCompletion(items);
    deal.updatedAt = new Date();
    return deal;
  }

  /**
   * Get pipeline view (deals grouped by stage)
   */
  getPipeline() {
    const pipeline = {
      'prospecting': [],
      'initial-contact': [],
      'due-diligence': [],
      'negotiation': [],
      'closing': [],
      'closed': [],
      'dead': []
    };

    for (const deal of this.deals) {
      if (deal.stage in pipeline) {
        pipeline[deal.stage].push(deal);
      }
    }

    return pipeline;
  }

  /**
   * Get all active deals (not closed/dead)
   */
  getActiveDeal() {
    return this.deals.filter(d => d.stage !== 'closed' && d.stage !== 'dead');
  }

  /**
   * Get dashboard summary
   */
  getDashboard() {
    const activeDeal = this.getActiveDeal();
    const pipeline = this.getPipeline();

    // Calculate metrics
    const metrics = {
      totalActive: activeDeal.length,
      totalValue: activeDeal.reduce((sum, d) => sum + (d.financials.targetPrice || 0), 0),
      avgTimeInStage: this._getAverageTimeInStage(),
      byStage: {
        prospecting: pipeline.prospecting.length,
        initialContact: pipeline['initial-contact'].length,
        dueDiligence: pipeline['due-diligence'].length,
        negotiation: pipeline.negotiation.length,
        closing: pipeline.closing.length
      },
      blockers: this._getActiveBlocker(),
      nextDueActions: this._getNextDueActions(7),
      ddStatus: this._getDDStatus()
    };

    return {
      pipeline,
      activeDeal,
      metrics,
      dashboard: {
        deals: activeDeal.map(d => this._formatDealCard(d)),
        summary: metrics
      }
    };
  }

  /**
   * Helper methods
   * @private
   */

  _getDeal(dealId) {
    const deal = this.deals.find(d => d.id === dealId);
    if (!deal) throw new Error(`Deal not found: ${dealId}`);
    return deal;
  }

  _getStageOrder(stage) {
    const order = {
      'prospecting': 0,
      'initial-contact': 1,
      'due-diligence': 2,
      'negotiation': 3,
      'closing': 4,
      'closed': 5,
      'dead': -1
    };
    return order[stage] || 0;
  }

  _calculateDDCompletion(items) {
    if (!items || items.length === 0) return 0;
    const complete = items.filter(i => i.status === 'complete').length;
    return Math.round((complete / items.length) * 100);
  }

  _getAverageTimeInStage() {
    if (this.deals.length === 0) return 0;
    const totalDays = this.deals.reduce((sum, d) => {
      return sum + differenceInDays(new Date(), new Date(d.createdAt));
    }, 0);
    return Math.round(totalDays / this.deals.length);
  }

  _getActiveBlocker() {
    return this.deals.flatMap(d => 
      d.blockers
        .filter(b => b.status !== 'resolved')
        .map(b => ({ ...b, dealId: d.id, dealName: d.name }))
    );
  }

  _getNextDueActions(daysAhead = 7) {
    const now = new Date();
    const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return this.deals
      .flatMap(d =>
        d.nextActions
          .filter(a => a.status !== 'complete' && a.dueDate && new Date(a.dueDate) <= cutoff)
          .map(a => ({ ...a, dealId: d.id, dealName: d.name }))
      )
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }

  _getDDStatus() {
    const ddStats = {};
    for (const deal of this.deals) {
      if (deal.stage === 'due-diligence' || deal.stage === 'negotiation') {
        const status = deal.dueDiligence.status;
        ddStats[status] = (ddStats[status] || 0) + 1;
      }
    }
    return ddStats;
  }

  _formatDealCard(deal) {
    return {
      id: deal.id,
      name: deal.name,
      target: deal.target.name,
      stage: deal.stage,
      daysInStage: differenceInDays(new Date(), new Date(deal.createdAt)),
      expectedClose: deal.dates.expectedClose,
      daysToClose: deal.dates.expectedClose ? differenceInDays(new Date(deal.dates.expectedClose), new Date()) : null,
      blockers: deal.blockers.filter(b => b.status !== 'resolved').length,
      ddCompletion: deal.dueDiligence.completionPercentage,
      nextActions: deal.nextActions.filter(a => a.status !== 'complete').length,
      value: deal.financials.targetPrice,
      lead: deal.team.lead
    };
  }
}

export default DealPipeline;
