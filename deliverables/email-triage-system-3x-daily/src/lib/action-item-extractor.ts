import * as fs from "fs";

interface ActionItem {
  type: "todo" | "decision" | "waiting";
  text: string;
  confidence: number;
}

interface ActionItemResult {
  hasAction: boolean;
  actions: ActionItem[];
  requiresResponse: boolean;
  responseType?: "acknowledgment" | "needsTime" | "needsDecision" | "default";
}

interface TriageConfig {
  actionKeywords: {
    todo: string[];
    decision: string[];
    waiting: string[];
  };
}

export class ActionItemExtractor {
  private config: TriageConfig;

  constructor(configPath: string) {
    const content = fs.readFileSync(configPath, "utf-8");
    const fullConfig = JSON.parse(content);
    this.config = fullConfig;
  }

  extract(subject: string, body: string): ActionItemResult {
    const text = `${subject}\n${body}`;
    const lowerText = text.toLowerCase();

    const actions: ActionItem[] = [];

    // Check for todo items
    for (const keyword of this.config.actionKeywords.todo) {
      if (lowerText.includes(keyword.toLowerCase())) {
        actions.push({
          type: "todo",
          text: this.extractSentence(text, keyword),
          confidence: 0.8,
        });
      }
    }

    // Check for decisions
    for (const keyword of this.config.actionKeywords.decision) {
      if (lowerText.includes(keyword.toLowerCase())) {
        actions.push({
          type: "decision",
          text: this.extractSentence(text, keyword),
          confidence: 0.85,
        });
      }
    }

    // Check for waiting items
    for (const keyword of this.config.actionKeywords.waiting) {
      if (lowerText.includes(keyword.toLowerCase())) {
        actions.push({
          type: "waiting",
          text: this.extractSentence(text, keyword),
          confidence: 0.75,
        });
      }
    }

    const hasAction = actions.length > 0;
    let responseType: "acknowledgment" | "needsTime" | "needsDecision" | "default" =
      "default";

    if (hasAction) {
      const hasDecision = actions.some((a) => a.type === "decision");
      const hasTodo = actions.some((a) => a.type === "todo");

      if (hasDecision) {
        responseType = "needsDecision";
      } else if (hasTodo) {
        responseType = "needsTime";
      } else {
        responseType = "acknowledgment";
      }
    }

    return {
      hasAction,
      actions: actions.slice(0, 3), // Limit to top 3 actions
      requiresResponse: hasAction,
      responseType: hasAction ? responseType : undefined,
    };
  }

  private extractSentence(text: string, keyword: string): string {
    const sentences = text.split(/[.!?]/);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
        return sentence.trim().slice(0, 150); // Max 150 chars
      }
    }
    return keyword;
  }
}
