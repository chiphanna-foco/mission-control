/**
 * API Endpoint: POST /api/reports/weekly-synthesis
 * 
 * Triggers generation of the weekly synthesis report on-demand.
 * 
 * Query Parameters:
 *   - date: YYYY-MM-DD (optional, defaults to current date)
 *   - dryRun: boolean (optional, defaults to false)
 *   - format: 'markdown' | 'json' (optional, defaults to 'markdown')
 * 
 * Request Body (optional):
 *   {
 *     "date": "2025-03-07",
 *     "dryRun": false,
 *     "includeSlackNotification": true
 *   }
 * 
 * Response:
 *   {
 *     "success": true,
 *     "reportPath": "/path/to/weekly-scorecard-YYYY-MM-DD.md",
 *     "generatedAt": "2025-03-07T16:00:00Z",
 *     "report": "... markdown content ..."
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Configuration
const SCRIPT_PATH = path.join(
  os.homedir(),
  'Documents/Shared/projects/build-weekly-synthesis-report/scripts/weekly-synthesis.js'
);

interface WeeklySynthesisRequest {
  date?: string;
  dryRun?: boolean;
  includeSlackNotification?: boolean;
  format?: 'markdown' | 'json';
}

interface WeeklySynthesisResponse {
  success: boolean;
  reportPath?: string;
  generatedAt: string;
  report?: string;
  data?: Record<string, any>;
  error?: string;
}

/**
 * Execute the weekly synthesis script
 */
async function executeWeeklySynthesis(request: WeeklySynthesisRequest): Promise<WeeklySynthesisResponse> {
  try {
    // Validate script exists
    if (!fs.existsSync(SCRIPT_PATH)) {
      return {
        success: false,
        generatedAt: new Date().toISOString(),
        error: `Script not found at ${SCRIPT_PATH}`,
      };
    }

    // Build command
    let cmd = `node ${SCRIPT_PATH}`;
    
    if (request.dryRun) {
      cmd += ' --dry-run';
    }
    
    if (request.date) {
      cmd += ` --date=${request.date}`;
    }

    // Execute script
    const output = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Parse output and find report path
    const reportMatch = output.match(/Report saved to (.+)/);
    const reportPath = reportMatch ? reportMatch[1] : null;

    // Read report content if successful
    let reportContent = '';
    if (reportPath && fs.existsSync(reportPath)) {
      reportContent = fs.readFileSync(reportPath, 'utf8');
    }

    return {
      success: true,
      reportPath: reportPath || undefined,
      generatedAt: new Date().toISOString(),
      report: reportContent || undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      generatedAt: new Date().toISOString(),
      error: `Failed to generate report: ${message}`,
    };
  }
}

/**
 * Parse request body and query parameters
 */
async function parseRequest(request: NextRequest): Promise<WeeklySynthesisRequest> {
  const req: WeeklySynthesisRequest = {};

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  if (searchParams.has('date')) {
    req.date = searchParams.get('date') || undefined;
  }
  if (searchParams.has('dryRun')) {
    req.dryRun = searchParams.get('dryRun') === 'true';
  }
  if (searchParams.has('format')) {
    req.format = (searchParams.get('format') as any) || 'markdown';
  }

  // Parse JSON body if present
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      Object.assign(req, body);
    } catch (e) {
      // No JSON body, continue with query params only
    }
  }

  return req;
}

/**
 * POST /api/reports/weekly-synthesis
 * Trigger report generation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const req = await parseRequest(request);
    const response = await executeWeeklySynthesis(req);

    const statusCode = response.success ? 200 : 400;
    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        success: false,
        generatedAt: new Date().toISOString(),
        error: `API error: ${message}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports/weekly-synthesis
 * Get status of latest report generation
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const stateFile = path.join(os.homedir(), '.mission-control/weekly-synthesis-state.json');

    if (!fs.existsSync(stateFile)) {
      return NextResponse.json(
        {
          success: false,
          generatedAt: new Date().toISOString(),
          error: 'No report generated yet',
        },
        { status: 404 }
      );
    }

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const reportPath = state.lastReport;

    let reportContent = '';
    if (reportPath && fs.existsSync(reportPath)) {
      reportContent = fs.readFileSync(reportPath, 'utf8');
    }

    return NextResponse.json(
      {
        success: true,
        reportPath,
        generatedAt: state.lastGenerated,
        report: reportContent,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        success: false,
        generatedAt: new Date().toISOString(),
        error: `Failed to fetch report: ${message}`,
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/reports/weekly-synthesis
 * CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
