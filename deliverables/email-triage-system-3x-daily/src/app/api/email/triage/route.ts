import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";

const execAsync = promisify(exec);

/**
 * POST /api/email/triage
 * Manually trigger email triage run
 * Optional query params:
 *   - full=true: Run full triage (default: incremental)
 *   - limit=N: Limit emails processed (default: 20)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (add your auth logic here)
    const authHeader = request.headers.get("authorization");
    if (!process.env.TRIAGE_API_KEY || authHeader !== `Bearer ${process.env.TRIAGE_API_KEY}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const isFull = searchParams.get("full") === "true";
    const limit = searchParams.get("limit") || "20";

    // Execute triage script
    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "email-triage.js"
    );

    const { stdout, stderr } = await execAsync(
      `node ${scriptPath} --limit=${limit}${isFull ? " --full" : ""}`,
      {
        timeout: 60000, // 60 second timeout
      }
    );

    if (stderr && !stderr.includes("Warning")) {
      console.error("Triage script stderr:", stderr);
    }

    // Parse results
    const resultsDir = path.join(process.cwd(), "results");
    const files = fs.readdirSync(resultsDir);
    const latestFile = files
      .sort()
      .reverse()[0];

    const resultsPath = path.join(resultsDir, latestFile);
    const results = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        results: {
          emailsProcessed: results.emailsProcessed,
          actionItems: results.actionItems.length,
          urgent: results.urgent.length,
          byDomain: Object.keys(results.byDomain),
          output: stdout,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Triage API error:", error);
    return NextResponse.json(
      {
        error: "Triage failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/email/triage
 * Get latest triage results
 */
export async function GET(request: NextRequest) {
  try {
    const resultsDir = path.join(process.cwd(), "results");

    if (!fs.existsSync(resultsDir)) {
      return NextResponse.json(
        { error: "No triage results found" },
        { status: 404 }
      );
    }

    const files = fs.readdirSync(resultsDir);
    if (files.length === 0) {
      return NextResponse.json(
        { error: "No triage results found" },
        { status: 404 }
      );
    }

    const latestFile = files.sort().reverse()[0];
    const resultsPath = path.join(resultsDir, latestFile);
    const results = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Failed to fetch triage results:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch results",
      },
      { status: 500 }
    );
  }
}
