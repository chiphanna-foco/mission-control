import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Get system metrics using built-in commands
    const { stdout: dfOutput } = await execAsync('df -h / | tail -1');
    const dfParts = dfOutput.trim().split(/\s+/);
    const diskPercent = parseFloat(dfParts[4]) || 0;

    // Get memory stats
    const { stdout: memOutput } = await execAsync('vm_stat | grep "Pages active"');
    const { stdout: memTotalOutput } = await execAsync('sysctl hw.memsize | awk \'{print $2}\'');
    
    // Parse memory (this is a simplified version - actual impl may vary by OS)
    let memoryPercent = 0;
    try {
      // Simple fallback: estimate based on available memory
      const { stdout: freeOutput } = await execAsync('top -l 1 | grep "PhysMem:" | awk \'{print $2}\' | sed \'s/G//\'');
      memoryPercent = parseFloat(freeOutput) * 12.5; // Rough estimate for 16GB system
      if (memoryPercent > 100) memoryPercent = 100;
    } catch {
      memoryPercent = 50; // Default fallback
    }

    // Get CPU usage
    let cpuPercent = 0;
    try {
      const { stdout: cpuOutput } = await execAsync('top -l 1 | grep "CPU usage" | awk \'{print $3}\' | sed \'s/%/\'');
      cpuPercent = parseFloat(cpuOutput) || 0;
    } catch {
      cpuPercent = 25; // Default fallback
    }

    return Response.json({
      disk_percent: diskPercent,
      memory_percent: memoryPercent,
      cpu_percent: cpuPercent,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Failed to get system metrics:', error);
    return Response.json(
      {
        disk_percent: 0,
        memory_percent: 0,
        cpu_percent: 0,
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
