// Purpose: Automated performance benchmark measuring real latency of core endpoints (Part 9 Step 4)
const http = require("http");
const os = require("os");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:5000/api/v1";
const SAMPLES = 50;

function requestAsync(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const start = process.hrtime.bigint();

    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || "GET",
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6;
        resolve({
          statusCode: res.statusCode,
          durationMs,
          body: data
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function calculateStats(durations) {
  const sorted = [...durations].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = sum / sorted.length;
  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const p95 = sorted[p95Index];

  return {
    min: Number(min.toFixed(2)),
    avg: Number(avg.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    max: Number(max.toFixed(2))
  };
}

async function runBenchmark() {
  console.log("=== AssetDesk Performance Benchmark (50 sequential runs per endpoint) ===");

  // 1. First authenticate to obtain admin JWT
  console.log("Obtaining admin authentication token...");
  const authRes = await requestAsync(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { email: "admin@assetdesk.local", password: "Demo@1234" });

  if (authRes.statusCode !== 200) {
    throw new Error(`Authentication failed with status ${authRes.statusCode}: ${authRes.body}`);
  }

  const authData = JSON.parse(authRes.body);
  const adminToken = authData.data.token;
  console.log("Admin token obtained.\n");

  const endpoints = [
    {
      name: "POST /auth/login",
      url: `${BASE_URL}/auth/login`,
      method: "POST",
      headers: { "Content-Type": "application/json", "x-benchmark": "true" },
      body: { email: "admin@assetdesk.local", password: "Demo@1234" }
    },
    {
      name: "GET /assets?limit=10",
      url: `${BASE_URL}/assets?limit=10`,
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    },
    {
      name: "GET /tickets?limit=10",
      url: `${BASE_URL}/tickets?limit=10`,
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    },
    {
      name: "GET /dashboard/summary",
      url: `${BASE_URL}/dashboard/summary`,
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    },
    {
      name: "GET /reports/assets",
      url: `${BASE_URL}/reports/assets`,
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    }
  ];

  const results = {};

  for (const ep of endpoints) {
    process.stdout.write(`Benchmarking ${ep.name}... `);
    const durations = [];

    for (let i = 0; i < SAMPLES; i++) {
      const res = await requestAsync(ep.url, {
        method: ep.method,
        headers: ep.headers
      }, ep.body);

      if (res.statusCode >= 400) {
        console.warn(`Warning: sample ${i + 1} returned status ${res.statusCode}`);
      }
      durations.push(res.durationMs);
    }

    const stats = calculateStats(durations);
    results[ep.name] = stats;
    console.log(`min: ${stats.min}ms | avg: ${stats.avg}ms | p95: ${stats.p95}ms | max: ${stats.max}ms`);
  }

  const cpus = os.cpus();
  const performancePayload = {
    generatedAt: new Date().toISOString(),
    samplesPerEndpoint: SAMPLES,
    machine: {
      platform: os.platform(),
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      cpu: cpus.length > 0 ? cpus[0].model : "Unknown",
      cpuCores: cpus.length,
      ramGb: Number((os.totalmem() / (1024 ** 3)).toFixed(1)),
      nodeVersion: process.version
    },
    endpoints: results
  };

  const outputDir = path.resolve(__dirname, "../../docs/build/data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "performance.json");
  fs.writeFileSync(outputPath, JSON.stringify(performancePayload, null, 2), "utf8");
  console.log(`\nBenchmark results saved successfully to: ${outputPath}`);
}

runBenchmark().catch((err) => {
  console.error("Benchmark execution failed:", err);
  process.exit(1);
});
