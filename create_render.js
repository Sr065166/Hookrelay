const https = require('https');

const data = JSON.stringify({
  type: 'web_service',
  name: 'hookrelay-backend',
  ownerId: 'tea-d6gl71c50q8c73a5js20',
  repo: 'https://github.com/Sr065166/Hookrelay',
  autoDeploy: 'yes',
  branch: 'main',
  serviceDetails: {
    env: 'node',
    plan: 'free',
    region: 'ohio',
    envSpecificDetails: {
      buildCommand: 'npm ci --workspace=server && npm run build --workspace=server',
      startCommand: 'npm start --workspace=server'
    },
    envVars: [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'PORT', value: '4000' },
      { key: 'DATABASE_URL', value: 'postgresql://postgres:cJJTN%24%40s%406gy7i3@db.hfekxalesgffdwgpwszh.supabase.co:5432/postgres' },
      { key: 'JWT_ACCESS_SECRET', value: 'super_secret_access_token_super_secret_access_token_super_secret' },
      { key: 'JWT_REFRESH_SECRET', value: 'super_secret_refresh_token_super_secret_refresh_token_super_secret' },
      { key: 'JWT_ACCESS_EXPIRES_IN', value: '15m' },
      { key: 'JWT_REFRESH_EXPIRES_IN', value: '7d' },
      { key: 'CLIENT_URL', value: 'https://hookrelay-web.vercel.app' }
    ]
  }
});

const options = {
  hostname: 'api.render.com',
  port: 443,
  path: '/v1/services',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rnd_OSUeMvlBrpfE7ebxdbnPXU3jmtk8',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(body);
  });
});

req.on('error', error => { console.error(error); });
req.write(data);
req.end();
