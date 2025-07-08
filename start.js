const { exec } = require('child_process');
const path = require('path');

// Suppress Node.js deprecation warnings
process.env.NODE_OPTIONS = '--no-warnings';

console.log('🚀 Starting InventIQ-Next-Gen...\n');

// Start backend server with cleaner output
const backend = exec('python backend/main.py', {
  cwd: __dirname,
  env: {
    ...process.env,
    FLASK_APP: 'main.py',
    FLASK_ENV: 'development',
    PYTHONUNBUFFERED: '1',
    PYTHONWARNINGS: 'ignore'  // Suppress Python warnings
  }
});

// Only show important backend messages
backend.stdout.on('data', (data) => {
  const str = data.toString();
  if (str.includes('Running on') || str.includes('Debugger PIN')) {
    console.log('[✓] Backend server started successfully');
    console.log('    http://localhost:5000\n');
  }
});

backend.stderr.on('data', (data) => {
  const str = data.toString();
  // Filter out common non-error messages
  if (!str.includes('WARNING: This is a development server') &&
      !str.includes('Debug mode: on') &&
      !str.includes('Restarting with stat') &&
      !str.includes('Debugger is active') &&
      !str.includes('127.0.0.1 - -') &&
      str.trim().length > 0) {
    console.error(`[!] Backend: ${str.trim()}`);
  }
});

// Start frontend server with cleaner output
setTimeout(() => {
  console.log('🌐 Starting frontend...');
  
  const frontend = exec('npm start', {
    cwd: path.join(__dirname, 'frontend'),
    env: {
      ...process.env,
      NODE_OPTIONS: '--openssl-legacy-provider',
      CI: 'false',  // Prevent CI-specific logging
      FAST_REFRESH: 'false'  // Reduce React refresh logs
    },
    shell: true
  });

  // Only show important frontend messages
  frontend.stdout.on('data', (data) => {
    const str = data.toString();
    if (str.includes('Compiled successfully')) {
      console.log('[✓] Frontend compiled successfully');
    }
    if (str.includes('Local:')) {
      console.log('    ' + str.split('Local:')[1].split('\n')[0].trim());
      console.log('    ' + str.split('On Your Network:')[1].split('\n')[0].trim() + '\n');
    }
  });

  frontend.stderr.on('data', (data) => {
    const str = data.toString();
    // Filter out common non-error messages
    if (!str.includes('deprecated') && 
        !str.includes('webpack') && 
        !str.includes('WDS') &&
        str.trim().length > 0) {
      console.error(`[!] Frontend: ${str.trim()}`);
    }
  });
  
  // Handle process termination
  const handleExit = () => {
    console.log('\n🛑 Shutting down servers...');
    backend.kill();
    frontend.kill();
    process.exit();
  };

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
}, 1000); // Reduced delay to 1 second
