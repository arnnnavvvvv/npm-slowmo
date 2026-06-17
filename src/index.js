/**
 * slowdep: realistic latency simulation for async functions
 * Wraps dependencies with production-accurate p50/p95/p99 distributions.
 */

// --- Lognormal sampler ---
// Real dependency latency follows a lognormal distribution:
// fast most of the time, occasionally slow, rarely very slow.
// We fit mu/sigma from your p50 and p99 targets.

function lognormalSample(mu, sigma) {
  // Box-Muller transform → standard normal → lognormal
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.exp(mu + sigma * z);
}

function fitLognormal(p50, p99) {
  // p50 = median = e^mu  →  mu = ln(p50)
  // p99 = e^(mu + 2.326*sigma)  →  sigma = (ln(p99) - mu) / 2.326
  const mu = Math.log(p50);
  const sigma = (Math.log(p99) - mu) / 2.326;
  return { mu, sigma };
}

function sampleLatency(p50, p99) {
  const { mu, sigma } = fitLognormal(p50, p99);
  const sample = lognormalSample(mu, sigma);
  return Math.min(sample, p99 * 3); // clamp absurd outliers
}

// --- Built-in presets ---
// Based on real-world p50/p95/p99 data from production systems.

export const presets = {
  postgres:  { p50: 5,   p95: 50,   p99: 200,  errorRate: 0.001  },
  mysql:     { p50: 4,   p95: 40,   p99: 180,  errorRate: 0.001  },
  redis:     { p50: 1,   p95: 5,    p99: 20,   errorRate: 0.0005 },
  mongodb:   { p50: 8,   p95: 60,   p99: 250,  errorRate: 0.001  },
  stripe:    { p50: 200, p95: 800,  p99: 2000, errorRate: 0.002  },
  openai:    { p50: 800, p95: 3000, p99: 8000, errorRate: 0.005  },
  anthropic: { p50: 600, p95: 2500, p99: 7000, errorRate: 0.005  },
  s3:        { p50: 30,  p95: 150,  p99: 500,  errorRate: 0.001  },
  dynamodb:  { p50: 3,   p95: 15,   p99: 50,   errorRate: 0.0005 },
  http:      { p50: 80,  p95: 300,  p99: 1000, errorRate: 0.01   },
};

// --- Core wrapper ---

export function withLatency(fn, profile) {
  let config;

  if (typeof profile === 'string') {
    if (!presets[profile]) {
      throw new Error(
        `slowdep: unknown preset "${profile}". Available: ${Object.keys(presets).join(', ')}`
      );
    }
    config = presets[profile];
  } else if (typeof profile === 'object' && profile !== null) {
    if (!profile.p50 || !profile.p99) {
      throw new Error('slowdep: custom profile requires at least { p50, p99 }');
    }
    config = {
      p50: profile.p50,
      p95: profile.p95 ?? profile.p99 * 0.6,
      p99: profile.p99,
      errorRate: profile.errorRate ?? 0,
    };
  } else {
    throw new Error('slowdep: profile must be a preset name or { p50, p95, p99 }');
  }

  return async function slowdepWrapped(...args) {
    const delay = sampleLatency(config.p50, config.p99);
    await sleep(delay);

    if (config.errorRate > 0 && Math.random() < config.errorRate) {
      throw new Error(`slowdep: simulated transient error (errorRate=${config.errorRate})`);
    }

    return fn.apply(this, args);
  };
}

export function withLatencyAll(obj, profile) {
  const wrapped = {};
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'function') {
      wrapped[key] = withLatency(obj[key].bind(obj), profile);
    } else {
      wrapped[key] = obj[key];
    }
  }
  return wrapped;
}

export async function slowdepDelay(profile) {
  const noop = async () => {};
  const wrapped = withLatency(noop, profile);
  await wrapped();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}