import * as fs from "fs";

interface UrgencyLevel {
  keywords: string[];
  deadline: number; // days
  level: number; // 5 = critical, 4 = high, 3 = medium, 2 = low
}

interface UrgencyResult {
  level: number; // 5 (critical) to 1 (low)
  levelName: string;
  isUrgent: boolean;
  keyword?: string;
  deadline?: Date;
  reasons: string[];
}

interface TriageConfig {
  urgencyPatterns: Record<string, UrgencyLevel>;
}

export class UrgencyDetector {
  private config: TriageConfig;

  constructor(configPath: string) {
    const content = fs.readFileSync(configPath, "utf-8");
    const fullConfig = JSON.parse(content);
    this.config = fullConfig;
  }

  detect(
    subject: string,
    body: string,
    from?: string
  ): UrgencyResult {
    const text = `${subject}\n${body}`;
    const lowerText = text.toLowerCase();

    const reasons: string[] = [];
    let maxLevel = 1;
    let triggeringKeyword: string | undefined;

    // Check urgency patterns
    for (const [patternName, pattern] of Object.entries(
      this.config.urgencyPatterns
    )) {
      for (const keyword of pattern.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          reasons.push(`Contains "${keyword}"`);
          if (pattern.level > maxLevel) {
            maxLevel = pattern.level;
            triggeringKeyword = keyword;
          }
        }
      }
    }

    // Check for deadline dates
    const deadlineMatch = this.extractDeadline(text);
    if (deadlineMatch) {
      reasons.push(`Deadline: ${deadlineMatch.toLocaleDateString()}`);
      if (deadlineMatch.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
        // Within 24 hours
        maxLevel = Math.max(maxLevel, 4);
      }
    }

    // Check sender reputation (if available)
    if (from && this.isCriticalSender(from)) {
      reasons.push("From critical sender");
      maxLevel = Math.max(maxLevel, 4);
    }

    const levelNames: Record<number, string> = {
      5: "CRITICAL",
      4: "HIGH",
      3: "MEDIUM",
      2: "LOW",
      1: "MINIMAL",
    };

    return {
      level: maxLevel,
      levelName: levelNames[maxLevel] || "UNKNOWN",
      isUrgent: maxLevel >= 3,
      keyword: triggeringKeyword,
      deadline: deadlineMatch,
      reasons,
    };
  }

  private extractDeadline(text: string): Date | null {
    // Look for common deadline patterns
    const patterns = [
      /deadline[:\s]+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}\/\d{4})/i,
      /due[:\s]+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}\/\d{4})/i,
      /by[:\s]+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}\/\d{4})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1];
        return this.parseDeadlineString(dateStr);
      }
    }

    return null;
  }

  private parseDeadlineString(dateStr: string): Date | null {
    const lower = dateStr.toLowerCase();
    const now = new Date();

    if (lower === "today") {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (lower === "tomorrow") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate()
      );
    } else if (/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(lower)) {
      // Parse day of week - find next occurrence
      const days: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      const targetDay = days[lower];
      const today = now.getDay();
      let daysAhead = targetDay - today;

      if (daysAhead <= 0) daysAhead += 7;

      const deadline = new Date(now);
      deadline.setDate(deadline.getDate() + daysAhead);
      return new Date(
        deadline.getFullYear(),
        deadline.getMonth(),
        deadline.getDate()
      );
    }

    // Try parsing as date
    const parsed = new Date(dateStr);
    return !isNaN(parsed.getTime()) ? parsed : null;
  }

  private isCriticalSender(from: string): boolean {
    // Extend this with your critical senders
    const criticalSenders = [
      "ceo@",
      "board@",
      "legal@",
      "compliance@",
      "customer@",
    ];

    return criticalSenders.some((sender) =>
      from.toLowerCase().includes(sender)
    );
  }
}
