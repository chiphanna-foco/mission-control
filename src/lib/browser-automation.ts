/**
 * Browser Automation Wrapper
 * Uses Puppeteer for LinkedIn profile scraping
 * Note: For production LinkedIn scraping, consider using Camofox instead
 */

import puppeteer from 'puppeteer';

let browserInstance: any = null;

/**
 * Get or create browser instance
 */
async function getBrowser() {
  if (browserInstance) {
    return browserInstance;
  }

  try {
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-resources',
      ],
    });

    return browserInstance;
  } catch (error) {
    console.error('[Browser] Failed to launch browser:', error);
    throw error;
  }
}

/**
 * Close browser instance
 */
export async function closeBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (e) {
      console.error('[Browser] Error closing browser:', e);
    }
    browserInstance = null;
  }
}

/**
 * Expose browser API compatible with Puppeteer
 */
export const browser = {
  newPage: async () => {
    const b = await getBrowser();
    const page = await b.newPage();

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    // Set viewport
    await page.setViewport({ width: 1280, height: 1024 });

    // Disable images & stylesheets for faster loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    return page;
  },

  close: closeBrowser,
};
