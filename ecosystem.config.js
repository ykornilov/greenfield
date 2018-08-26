module.exports = {
  apps: [{
    name: 'disp',
    args: [],
    script: './src/server/app.js',
    instances: 1,
    interpreter: 'node',
    exec_mode: 'fork',
    error: './log/err.log',
    output: './log/out.log',
    pid_file: './log/process.pid',
    listen_timeout: 10000,
    kill_timeout: 10000,
    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
    },
  }],
};
