// Proxy server — serves the HTML and forwards API calls to Travelport.
// Bypasses browser CORS restrictions: browser → localhost:3000 → Travelport.
// Usage: node server.js   then open http://localhost:3000
//
// Note: Node's DNS → TCP path to api.travelport.net times out in this env.
// Workaround: resolve the IP first, then connect by IP with SNI (hostname header).

require('dns').setDefaultResultOrder('ipv4first');

const https   = require('https');
const dns     = require('dns').promises;
const path    = require('path');
const express = require('express');

const app = express();

// Cache resolved IPs so we don't DNS-lookup on every request
const ipCache = {};
async function resolveIP(hostname) {
  if (!ipCache[hostname]) {
    const { address } = await dns.lookup(hostname, { family: 4 }); // force IPv4
    ipCache[hostname] = address;
  }
  return ipCache[hostname];
}

// Capture raw body byte-for-byte for proxying
app.use((req, _res, next) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => { req.rawBody = Buffer.concat(chunks); next(); });
});

// Serve the HTML tester
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'travelport-flight.html')));

const UPSTREAMS = {
  'auth':    'auth.travelport.net',
  'api':     'api.travelport.net',
  'auth-pp': 'auth.pp.travelport.net',
  'api-pp':  'api.pp.travelport.net',
};

function makeProxy(hostname) {
  return async (req, res) => {
    const targetPath = req.url || '/';
    try {
      const ip = await resolveIP(hostname);

      const headers = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (!['host', 'origin', 'referer', 'connection'].includes(k.toLowerCase())) {
          headers[k] = v;
        }
      }
      headers['host'] = hostname;
      if (req.rawBody.length) headers['content-length'] = String(req.rawBody.length);

      await new Promise((resolve, reject) => {
        const opts = {
          hostname:   ip,          // connect by IP to avoid DNS stall
          servername: hostname,    // SNI so TLS cert validates
          path:       targetPath,
          method:     req.method,
          headers,
          timeout:    20000,
        };

        const pr = https.request(opts, pres => {
          // Strip hop-by-hop headers before forwarding
          const skip = new Set(['transfer-encoding', 'connection', 'keep-alive']);
          const fwdHeaders = {};
          for (const [k, v] of Object.entries(pres.headers)) {
            if (!skip.has(k.toLowerCase())) fwdHeaders[k] = v;
          }
          res.writeHead(pres.statusCode, fwdHeaders);
          pres.pipe(res, { end: true });
          pres.on('end', resolve);
        });

        pr.on('timeout', () => { pr.destroy(new Error('upstream timeout')); });
        pr.on('error', reject);

        if (req.rawBody.length) pr.write(req.rawBody);
        pr.end();
      });
    } catch (e) {
      console.error(`[proxy ${hostname}] ${e.message}`);
      if (!res.headersSent) res.status(502).json({ error: e.message });
    }
  };
}

for (const [prefix, hostname] of Object.entries(UPSTREAMS)) {
  app.use(`/proxy/${prefix}`, makeProxy(hostname));
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Travelport proxy → http://localhost:${PORT}`);
  console.log(`  /proxy/auth    → https://auth.travelport.net`);
  console.log(`  /proxy/api     → https://api.travelport.net`);
  console.log(`  /proxy/auth-pp → https://auth.pp.travelport.net`);
  console.log(`  /proxy/api-pp  → https://api.pp.travelport.net`);
});
