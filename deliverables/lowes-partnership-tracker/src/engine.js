/**
 * Lowes Partnership Tracker - Core Engine
 * 
 * Main tracking system for deal status, legal timeline, category prioritization,
 * member segmentation, and launch readiness
 */

import { v4 as uuid } from 'uuid';
import { addDays, differenceInDays, isPast, isFuture } from 'date-fns';

export class PartnershipTracker {
  constructor(dealId, options = {}) {
    this.dealId = dealId;
    this.dealName = options.dealName || 'Partnership Deal';
    this.status = options.status || 'In Negotiation';
    this.expectedClose = options.expectedClose || null;
    
    this.milestones = [];
    this.categories = [];
    this.memberSegments = [];
    this.readinessItems = [];
    
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Add legal milestone
   */
  addMilestone(name, details = {}) {
    const milestone = {
      id: uuid(),
      dealId: this.dealId,
      name,
      dueDate: details.dueDate || null,
      status: details.status || 'pending', // pending, in_progress, complete, delayed, blocked
      owner: details.owner || null,
      priority: details.priority || 'medium', // low, medium, high, critical
      description: details.description || null,
      dependencies: details.dependencies || [],
      actualCompleteDate: details.actualCompleteDate || null,
      notes: details.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.milestones.push(milestone);
    this._updateTimestamp();
    return milestone;
  }

  /**
   * Update milestone status
   */
  updateMilestone(milestoneId, updates) {
    const milestone = this.milestones.find(m => m.id === milestoneId);
    if (!milestone) throw new Error(`Milestone not found: ${milestoneId}`);

    Object.assign(milestone, updates, { updatedAt: new Date() });

    // Mark as complete if status is complete
    if (updates.status === 'complete') {
      milestone.actualCompleteDate = new Date();
    }

    this._updateTimestamp();
    return milestone;
  }

  /**
   * Get all milestones sorted by due date
   */
  getMilestones(filter = {}) {
    let milestones = [...this.milestones];

    if (filter.status) {
      milestones = milestones.filter(m => m.status === filter.status);
    }
    if (filter.priority) {
      milestones = milestones.filter(m => m.priority === filter.priority);
    }
    if (filter.owner) {
      milestones = milestones.filter(m => m.owner === filter.owner);
    }

    return milestones.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }

  /**
   * Check legal timeline status
   */
  getLegalStatus() {
    const total = this.milestones.length;
    const complete = this.milestones.filter(m => m.status === 'complete').length;
    const inProgress = this.milestones.filter(m => m.status === 'in_progress').length;
    const delayed = this.milestones.filter(m => m.status === 'delayed').length;
    const blocked = this.milestones.filter(m => m.status === 'blocked').length;

    const timelineHealthy = delayed === 0 && blocked === 0;
    const completionPercentage = total > 0 ? Math.round((complete / total) * 100) : 0;

    return {
      totalMilestones: total,
      completed: complete,
      inProgress,
      delayed,
      blocked,
      completionPercentage,
      timelineHealthy,
      daysUntilClose: this._daysUntilClose(),
      atRiskMilestones: this._getAtRiskMilestones()
    };
  }

  /**
   * Add Lowes category to track
   */
  addCategory(name, details = {}) {
    const category = {
      id: uuid(),
      dealId: this.dealId,
      name,
      priority: details.priority || 999, // 1 = highest priority
      expectedROI: details.roi || details.expectedROI || 0,
      launchDate: details.launchDate || null,
      readinessPercentage: details.readiness || 0,
      memberDemand: details.memberDemand || 'unknown', // low, medium, high
      inventoryStatus: details.inventory || 'planning', // planning, sourcing, ready, live
      technicalStatus: details.technicalStatus || 'planning', // planning, in_progress, testing, ready
      notes: details.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.categories.push(category);
    this._updateTimestamp();
    return category;
  }

  /**
   * Update category readiness
   */
  updateCategory(categoryId, updates) {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category) throw new Error(`Category not found: ${categoryId}`);

    Object.assign(category, updates, { updatedAt: new Date() });
    this._updateTimestamp();
    return category;
  }

  /**
   * Get categories sorted by priority
   */
  getCategories(sort = 'priority') {
    let categories = [...this.categories];

    if (sort === 'priority') {
      return categories.sort((a, b) => a.priority - b.priority);
    }
    if (sort === 'roi') {
      return categories.sort((a, b) => b.expectedROI - a.expectedROI);
    }
    if (sort === 'launch') {
      return categories.sort((a, b) => {
        if (!a.launchDate) return 1;
        if (!b.launchDate) return -1;
        return new Date(a.launchDate) - new Date(b.launchDate);
      });
    }

    return categories;
  }

  /**
   * Get category launch roadmap (grouped by launch date)
   */
  getCategoryRoadmap() {
    const roadmap = {};

    for (const category of this.getCategories('launch')) {
      const launchDate = category.launchDate || 'TBD';
      if (!roadmap[launchDate]) {
        roadmap[launchDate] = [];
      }
      roadmap[launchDate].push(category);
    }

    return roadmap;
  }

  /**
   * Add member segment
   */
  addSegment(name, details = {}) {
    const segment = {
      id: uuid(),
      dealId: this.dealId,
      name,
      description: details.description || null,
      targetMemberCount: details.size || details.targetCount || 0,
      launchDate: details.launchDate || null,
      launchPhase: details.phase || 1, // 1, 2, 3, etc for rollout phases
      selectionCriteria: details.criteria || {},
      readinessPercentage: details.readiness || 0,
      expectedConversion: details.conversion || 0.5,
      notes: details.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.memberSegments.push(segment);
    this._updateTimestamp();
    return segment;
  }

  /**
   * Get member segments grouped by launch phase
   */
  getSegmentsByPhase() {
    const phases = {};

    for (const segment of this.memberSegments.sort((a, b) => a.launchPhase - b.launchPhase)) {
      const phase = `Phase ${segment.launchPhase}`;
      if (!phases[phase]) {
        phases[phase] = [];
      }
      phases[phase].push(segment);
    }

    return phases;
  }

  /**
   * Add launch readiness item
   */
  addReadinessItem(name, details = {}) {
    const item = {
      id: uuid(),
      dealId: this.dealId,
      name,
      category: details.category || 'other', // legal, technical, marketing, operations, member
      status: details.status || 'pending', // pending, in_progress, complete, blocked
      owner: details.owner || null,
      dueDate: details.dueDate || null,
      priority: details.priority || 'medium',
      percentComplete: details.percentComplete || 0,
      blockers: details.blockers || [],
      notes: details.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.readinessItems.push(item);
    this._updateTimestamp();
    return item;
  }

  /**
   * Update readiness item
   */
  updateReadinessItem(itemId, updates) {
    const item = this.readinessItems.find(i => i.id === itemId);
    if (!item) throw new Error(`Readiness item not found: ${itemId}`);

    Object.assign(item, updates, { updatedAt: new Date() });
    this._updateTimestamp();
    return item;
  }

  /**
   * Get overall launch readiness
   */
  getReadiness() {
    const byCategory = {};
    let totalWeight = 0;
    let totalScore = 0;

    // Weight each category
    const categoryWeights = {
      legal: 0.30,         // Contracts/approvals
      technical: 0.25,     // Integration/systems
      marketing: 0.15,     // Communications/launch prep
      operations: 0.20,    // Processes/readiness
      member: 0.10         // Member onboarding
    };

    for (const [category, weight] of Object.entries(categoryWeights)) {
      const items = this.readinessItems.filter(i => i.category === category);
      
      if (items.length === 0) {
        byCategory[category] = { percentage: 0, items: 0, complete: 0 };
        continue;
      }

      const complete = items.filter(i => i.status === 'complete').length;
      const percentage = Math.round((complete / items.length) * 100);

      byCategory[category] = {
        percentage,
        items: items.length,
        complete,
        blocked: items.filter(i => i.status === 'blocked').length
      };

      totalScore += percentage * weight;
      totalWeight += weight;
    }

    const overallPercentage = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

    return {
      overall: overallPercentage,
      byCategory,
      blockers: this.readinessItems.filter(i => i.status === 'blocked'),
      readyToLaunch: overallPercentage >= 90,
      daysUntilMinimumReadiness: this._daysUntilMinimumReadiness()
    };
  }

  /**
   * Get readiness items grouped by category
   */
  getReadinessByCategory(category) {
    return this.readinessItems
      .filter(item => item.category === category)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
      });
  }

  /**
   * Get deal summary for dashboard
   */
  getDealSummary() {
    const legal = this.getLegalStatus();
    const readiness = this.getReadiness();
    const totalRevenue = this.categories.reduce((sum, c) => sum + c.expectedROI, 0);
    const totalMembers = this.memberSegments.reduce((sum, s) => sum + s.targetMemberCount, 0);

    return {
      dealId: this.dealId,
      dealName: this.dealName,
      status: this.status,
      expectedClose: this.expectedClose,
      daysUntilClose: this._daysUntilClose(),
      legal,
      readiness,
      categories: {
        total: this.categories.length,
        byPriority: this._categoriesByPriority()
      },
      memberSegments: {
        total: this.memberSegments.length,
        totalCapacity: totalMembers,
        phases: this.getSegmentsByPhase()
      },
      revenue: {
        totalExpected: totalRevenue,
        topCategories: this.getCategories('roi').slice(0, 3)
      },
      risks: this._identifyRisks(),
      updatedAt: this.updatedAt
    };
  }

  /**
   * Export deal status as JSON
   */
  export() {
    return {
      deal: {
        id: this.dealId,
        name: this.dealName,
        status: this.status,
        expectedClose: this.expectedClose,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      },
      milestones: this.milestones,
      categories: this.categories,
      memberSegments: this.memberSegments,
      readinessItems: this.readinessItems,
      summary: this.getDealSummary()
    };
  }

  /**
   * Helper methods
   * @private
   */

  _daysUntilClose() {
    if (!this.expectedClose) return null;
    return differenceInDays(new Date(this.expectedClose), new Date());
  }

  _daysUntilMinimumReadiness() {
    const notComplete = this.readinessItems.filter(i => i.status !== 'complete' && i.priority === 'critical');
    if (notComplete.length === 0) return 0;

    const nearestDue = notComplete
      .filter(i => i.dueDate)
      .map(i => new Date(i.dueDate))
      .sort((a, b) => a - b)[0];

    return nearestDue ? differenceInDays(nearestDue, new Date()) : 999;
  }

  _getAtRiskMilestones() {
    return this.milestones.filter(m => {
      if (m.status === 'blocked' || m.status === 'delayed') return true;
      if (m.status === 'in_progress' && m.dueDate) {
        const daysLeft = differenceInDays(new Date(m.dueDate), new Date());
        return daysLeft < 5;
      }
      return false;
    });
  }

  _categoriesByPriority() {
    return this.categories.reduce((acc, cat) => {
      const group = `Priority ${cat.priority}`;
      if (!acc[group]) acc[group] = 0;
      acc[group]++;
      return acc;
    }, {});
  }

  _identifyRisks() {
    const risks = [];

    // Legal risks
    const delayedMilestones = this.milestones.filter(m => m.status === 'delayed');
    if (delayedMilestones.length > 0) {
      risks.push({
        type: 'legal',
        severity: 'high',
        message: `${delayedMilestones.length} legal milestone(s) delayed`,
        items: delayedMilestones
      });
    }

    // Readiness risks
    const blockedItems = this.readinessItems.filter(i => i.status === 'blocked');
    if (blockedItems.length > 0) {
      risks.push({
        type: 'readiness',
        severity: 'critical',
        message: `${blockedItems.length} critical blocker(s)`,
        items: blockedItems
      });
    }

    // Timeline risks
    const days = this._daysUntilClose();
    if (days && days < 30 && this.getReadiness().overall < 80) {
      risks.push({
        type: 'timeline',
        severity: 'high',
        message: `Only ${days} days until close, readiness at ${this.getReadiness().overall}%`
      });
    }

    return risks;
  }

  _updateTimestamp() {
    this.updatedAt = new Date();
  }
}

export default PartnershipTracker;
