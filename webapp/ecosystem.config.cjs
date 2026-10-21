module.exports = {
  apps: [{
    name: 'academic-helpdesk',
    cwd: '/home/user/webapp/server',
    script: 'src/index.js',
    env: { NODE_ENV: 'development', PORT: 3000 },
    watch: false,
    instances: 1,
    exec_mode: 'fork',
  }],
};
