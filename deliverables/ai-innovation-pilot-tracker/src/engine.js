/**
 * AI Innovation Pilot Tracker
 * Tracks all AI tool experiments at TT: what, who, results, ROI, case studies
 */

import { v4 as uuid } from 'uuid';
import { differenceInDays } from 'date-fns';

export class PilotTracker {
  constructor() {
    this.pilots = [];
    this.createdAt = new Date();
  }

  /**
   * Add AI pilot
   */
  addPilot(name, details = {}) {
    const pilot = {
      id: uuid(),
      name,
      category: details.category || 'other', // content, productivity, operations, customer-service, analytics
      tool: details.tool || null, // e.g., "Claude", "GPT-4", "Custom LLM"
      status: details.status || 'planned', // planned, in-progress, completed, paused, failed
      startDate: details.startDate || new Date().toISOString(),
      endDate: details.endDate || null,
      pilots: {
        lead: details.lead || null,
        team: details.team || [],
        affectedUsers: details.affectedUsers || 0
      },
      description: details.description || null,
      objectives: details.objectives || [],
      metrics: {
        timeToComplete: null,
        costSavings: 0,
        efficiencyGain: 0, // percentage
        qualityImprovement: 0, // percentage
        userSatisfaction: 0, // 1-5 scale
        adoptionRate: 0 // percentage
      },
      roi: {
        totalInvestment: details.investment || 0,
        monthlyBenefit: 0,
        paybackMonths: null,
        roi: 0
      },
      results: {
        outcome: 'pending', // success, partial, failure
        keyFindings: [],
        challenges: [],
        nextSteps: []
      },
      caseStudy: {
        status: 'not-started', // not-started, in-progress, ready
        title: null,
        summary: null,
        impact: null,
        lessons: []
      },
      notes: details.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.pilots.push(pilot);
    return pilot;
  }

  /**
   * Update pilot
   */
  updatePilot(pilotId, updates) {
    const pilot = this._getPilot(pilotId);
    Object.assign(pilot, updates, { updatedAt: new Date() });
    return pilot;
  }

  /**
   * Add metrics to pilot
   */
  recordMetrics(pilotId, metrics) {
    const pilot = this._getPilot(pilotId);
    Object.assign(pilot.metrics, metrics);
    this._calculateROI(pilot);
    pilot.updatedAt = new Date();
    return pilot;
  }

  /**
   * Record results
   */
  recordResults(pilotId, results) {
    const pilot = this._getPilot(pilotId);
    Object.assign(pilot.results, results);
    pilot.status = 'completed';
    pilot.endDate = new Date().toISOString();
    pilot.updatedAt = new Date();
    return pilot;
  }

  /**
   * Create case study from successful pilot
   */
  createCaseStudy(pilotId, caseStudyData) {
    const pilot = this._getPilot(pilotId);
    
    if (pilot.results.outcome !== 'success') {
      throw new Error('Case studies should be based on successful pilots');
    }

    pilot.caseStudy = {
      status: 'ready',
      title: caseStudyData.title || `${pilot.name} - Success Case Study`,
      summary: caseStudyData.summary || null,
      impact: caseStudyData.impact || this._generateImpactStatement(pilot),
      lessons: caseStudyData.lessons || pilot.results.keyFindings
    };

    pilot.updatedAt = new Date();
    return pilot;
  }

  /**
   * Get all pilots
   */
  getAllPilots(filter = {}) {
    let pilots = [...this.pilots];

    if (filter.status) {
      pilots = pilots.filter(p => p.status === filter.status);
    }
    if (filter.category) {
      pilots = pilots.filter(p => p.category === filter.category);
    }
    if (filter.outcome) {
      pilots = pilots.filter(p => p.results.outcome === filter.outcome);
    }

    return pilots;
  }

  /**
   * Get successful pilots (for case studies)
   */
  getSuccessfulPilots() {
    return this.pilots.filter(p => p.results.outcome === 'success' && p.status === 'completed');
  }

  /**
   * Get dashboard summary
   */
  getDashboard() {
    const total = this.pilots.length;
    const inProgress = this.pilots.filter(p => p.status === 'in-progress').length;
    const completed = this.pilots.filter(p => p.status === 'completed').length;
    const successful = this.pilots.filter(p => p.results.outcome === 'success').length;
    const totalROI = this.pilots.reduce((sum, p) => sum + p.roi.roi, 0);
    const avgROI = total > 0 ? totalROI / total : 0;

    return {
      summary: {
        total,
        inProgress,
        completed,
        successful,
        successRate: total > 0 ? Math.round((successful / completed) * 100) : 0
      },
      roi: {
        totalInvestment: this.pilots.reduce((sum, p) => sum + p.roi.totalInvestment, 0),
        totalMonthlyBenefit: this.pilots.reduce((sum, p) => sum + p.roi.monthlyBenefit, 0),
        averageROI: Math.round(avgROI)
      },
      byCategory: this._categorizeByType(),
      caseStudies: this.pilots.filter(p => p.caseStudy.status === 'ready').length,
      pilots: this.pilots.map(p => this._formatPilotCard(p))
    };
  }

  /**
   * Get case studies for leadership
   */
  getCaseStudies() {
    return this.pilots
      .filter(p => p.caseStudy.status === 'ready')
      .map(p => ({
        id: p.id,
        title: p.caseStudy.title,
        tool: p.tool,
        category: p.category,
        summary: p.caseStudy.summary,
        impact: p.caseStudy.impact,
        lessons: p.caseStudy.lessons,
        metrics: {
          timeToComplete: p.metrics.timeToComplete,
          efficiencyGain: p.metrics.efficiencyGain,
          roi: p.roi.roi
        }
      }));
  }

  /**
   * Generate case study report for leadership
   */
  generateLeadershipReport() {
    const successful = this.getSuccessfulPilots();
    const caseStudies = this.getCaseStudies();

    return {
      overview: {
        totalPilots: this.pilots.length,
        successRate: this.pilots.length > 0 ? Math.round((successful.length / this.pilots.length) * 100) : 0,
        totalROI: this.pilots.reduce((sum, p) => sum + p.roi.roi, 0),
        totalBenefit: this.pilots.reduce((sum, p) => sum + p.roi.monthlyBenefit, 0) * 12
      },
      successStories: caseStudies,
      recommendations: this._generateRecommendations(),
      timeline: this._generateTimeline()
    };
  }

  /**
   * Helper methods
   * @private
   */

  _getPilot(pilotId) {
    const pilot = this.pilots.find(p => p.id === pilotId);
    if (!pilot) throw new Error(`Pilot not found: ${pilotId}`);
    return pilot;
  }

  _calculateROI(pilot) {
    if (pilot.roi.totalInvestment === 0) return;

    const monthlyBenefit = pilot.roi.monthlyBenefit;
    const totalBenefit = monthlyBenefit * 12; // Annual
    const roiPercent = ((totalBenefit - pilot.roi.totalInvestment) / pilot.roi.totalInvestment) * 100;
    const paybackMonths = monthlyBenefit > 0 ? Math.ceil(pilot.roi.totalInvestment / monthlyBenefit) : null;

    pilot.roi.roi = Math.round(roiPercent);
    pilot.roi.paybackMonths = paybackMonths;
  }

  _formatPilotCard(pilot) {
    return {
      id: pilot.id,
      name: pilot.name,
      tool: pilot.tool,
      category: pilot.category,
      status: pilot.status,
      lead: pilot.pilots.lead,
      efficiencyGain: pilot.metrics.efficiencyGain,
      roi: pilot.roi.roi,
      outcome: pilot.results.outcome,
      daysRunning: pilot.endDate ? differenceInDays(new Date(pilot.endDate), new Date(pilot.startDate)) : differenceInDays(new Date(), new Date(pilot.startDate))
    };
  }

  _categorizeByType() {
    const categories = {};
    for (const pilot of this.pilots) {
      if (!categories[pilot.category]) {
        categories[pilot.category] = { total: 0, successful: 0 };
      }
      categories[pilot.category].total++;
      if (pilot.results.outcome === 'success') {
        categories[pilot.category].successful++;
      }
    }
    return categories;
  }

  _generateImpactStatement(pilot) {
    const parts = [];
    if (pilot.metrics.efficiencyGain > 0) {
      parts.push(`${pilot.metrics.efficiencyGain}% efficiency gain`);
    }
    if (pilot.roi.roi > 0) {
      parts.push(`${pilot.roi.roi}% ROI`);
    }
    if (pilot.metrics.timeToComplete) {
      parts.push(`completed in ${pilot.metrics.timeToComplete} days`);
    }
    return parts.join(', ');
  }

  _generateRecommendations() {
    const successful = this.getSuccessfulPilots();
    return successful
      .sort((a, b) => b.roi.roi - a.roi.roi)
      .slice(0, 3)
      .map(p => ({
        tool: p.tool,
        recommendation: `Scale ${p.name} - ${p.roi.roi}% ROI`,
        priority: p.roi.roi > 100 ? 'High' : 'Medium'
      }));
  }

  _generateTimeline() {
    return this.pilots
      .filter(p => p.status === 'completed')
      .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        completed: new Date(p.endDate).toLocaleDateString(),
        outcome: p.results.outcome
      }));
  }
}

export default PilotTracker;
