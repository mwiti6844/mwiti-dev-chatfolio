// Run: npm test   (serves the folder with python3 on :8123; no build step)
const { defineConfig, devices } = require('@playwright/test');

const projects = [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }];
if (process.env.WEBKIT) projects.push({ name: 'webkit', use: { ...devices['Desktop Safari'] } });

module.exports = defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  workers: process.env.WEBKIT ? 3 : undefined, // WebKit + python http.server time out under heavy parallel load
  reporter: [['list']],
  use: { baseURL: 'http://localhost:8123' },
  webServer: {
    command: 'python3 -m http.server 8123',
    url: 'http://localhost:8123/',
    reuseExistingServer: true,
  },
  projects,
});
