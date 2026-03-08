import * as fs from "fs";
import * as path from "path";

interface DomainConfig {
  label: string;
  keywords: string[];
  emails: string[];
  priority: string;
  context: string;
}

interface TriageConfig {
  domains: Record<string, DomainConfig>;
}

export interface ClassificationResult {
  domain: string;
  label: string;
  priority: string;
  context: string;
  confidence: number;
}

export class EmailClassifier {
  private config: TriageConfig;

  constructor(configPath: string) {
    const content = fs.readFileSync(configPath, "utf-8");
    this.config = JSON.parse(content);
  }

  classify(
    from: string,
    subject: string,
    body: string
  ): ClassificationResult {
    const text = `${from} ${subject} ${body}`.toLowerCase();

    let bestMatch: ClassificationResult | null = null;
    let bestScore = 0;

    for (const [domain, config] of Object.entries(this.config.domains)) {
      let score = 0;

      // Check email domain match (highest weight)
      for (const emailDomain of config.emails) {
        if (from.toLowerCase().includes(emailDomain)) {
          score += 100;
        }
      }

      // Check keyword matches
      for (const keyword of config.keywords) {
        const count = (text.match(new RegExp(keyword.toLowerCase(), "g")) || [])
          .length;
        score += count * 10;
      }

      // Normalize score
      const confidence = Math.min(score / 100, 1);

      if (confidence > bestScore) {
        bestScore = confidence;
        bestMatch = {
          domain,
          label: config.label,
          priority: config.priority,
          context: config.context,
          confidence,
        };
      }
    }

    // Default to "uncategorized" if no match
    return (
      bestMatch || {
        domain: "uncategorized",
        label: "Uncategorized",
        priority: "low",
        context: "Other",
        confidence: 0,
      }
    );
  }

  classifyBatch(
    emails: Array<{
      from: string;
      subject: string;
      body: string;
    }>
  ) {
    return emails.map((email) => ({
      ...email,
      classification: this.classify(email.from, email.subject, email.body),
    }));
  }
}
