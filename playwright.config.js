const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:8081',
    trace: 'on-first-retry',
  },
  webServer: {
    command: process.platform === 'win32' ? 'set PORT=8081 && python src/main.py' : 'PORT=8081 python src/main.py',
    url: 'http://127.0.0.1:8081',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-proxy-server',
            '--disable-background-networking',
            '--disable-component-update',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding'
          ]
        }
      },
    },
  ],
});
