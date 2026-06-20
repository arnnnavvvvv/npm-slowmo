# slowdep

> Wrap any async function with realistic latency. Test how your app survives slow, unpredictable dependencies.

```bash
npm install slowdep
```
[![npm](https://img.shields.io/npm/dt/slowdep?color=brightgreen&label=downloads)](https://www.npmjs.com/package/slowdep)
---

## The problem with `setTimeout`

When you test against a slow dependency, you probably do something like:

```js
await new Promise(r => setTimeout(r, 200)); // simulate DB
```

Real databases don't work like that. In production, your Postgres instance responds in 5ms most of the time, 200ms occasionally, and 2000ms when something's wrong. A flat 200ms delay doesn't test the case that actually breaks your app — the variance.

**`slowdep` samples from a lognormal distribution fitted to your p50/p99 targets.** That's the same statistical shape real production systems follow: fast most of the time, occasionally slow, rarely very slow.

---

## Usage

### Drop-in preset

```js
import { withLatency } from 'slowdep';

const findUser = async (id) => db.query('SELECT * FROM users WHERE id = $1', [id]);

// Now behaves like a real Postgres call: p50=5ms, p95=50ms, p99=200ms
const slowFindUser = withLatency(findUser, 'postgres');

const user = await slowFindUser(42); // realistically slow, every call different
```

### Custom profile

```js
const slowFetch = withLatency(fetchExternalAPI, {
  p50: 100,   // typical call: ~100ms
  p99: 2000,  // worst 1%: up to 2 seconds
  errorRate: 0.01, // 1% of calls throw a transient error
});
```

### Wrap an entire client

```js
import { withLatencyAll } from 'slowdep';

const slowRedis = withLatencyAll(redisClient, 'redis');

await slowRedis.get('key');   // slow
await slowRedis.set('k', 'v'); // also slow
```

### Standalone delay

```js
import { slowdepDelay } from 'slowdep';

await slowdepDelay('stripe');
// continues after a Stripe-realistic delay
```

---

## Presets

Built-in profiles based on real-world p50/p95/p99 data:

| Preset      | p50    | p95     | p99     | Error rate |
|-------------|--------|---------|---------|------------|
| `postgres`  | 5ms    | 50ms    | 200ms   | 0.1%       |
| `mysql`     | 4ms    | 40ms    | 180ms   | 0.1%       |
| `redis`     | 1ms    | 5ms     | 20ms    | 0.05%      |
| `mongodb`   | 8ms    | 60ms    | 250ms   | 0.1%       |
| `dynamodb`  | 3ms    | 15ms    | 50ms    | 0.05%      |
| `s3`        | 30ms   | 150ms   | 500ms   | 0.1%       |
| `stripe`    | 200ms  | 800ms   | 2000ms  | 0.2%       |
| `openai`    | 800ms  | 3000ms  | 8000ms  | 0.5%       |
| `anthropic` | 600ms  | 2500ms  | 7000ms  | 0.5%       |
| `http`      | 80ms   | 300ms   | 1000ms  | 1%         |

---

## Why lognormal?

Latency distributions in distributed systems are right-skewed: most requests are fast, but a long tail of slow requests exists due to GC pauses, cold caches, network jitter, and noisy neighbors. The lognormal distribution captures this shape accurately.

`slowdep` fits a lognormal curve to your p50 and p99 values, so every sampled delay reflects the statistical reality of production traffic — not a flat number that gives you false confidence.

---

## API

### `withLatency(fn, profile)`

Wraps an async function. Returns a function with the identical signature.

- `fn` — any async function
- `profile` — preset name (`'postgres'`, `'redis'`, etc.) or `{ p50, p99, p95?, errorRate? }`

### `withLatencyAll(obj, profile)`

Wraps every async method on an object with the same profile. Non-function properties are preserved.

### `slowdepDelay(profile)`

Returns a `Promise<void>` that resolves after a realistic delay. No function needed.

### `presets`

The raw preset config object — import and inspect or extend:

```js
import { presets } from 'slowdep';
console.log(presets.postgres); // { p50: 5, p95: 50, p99: 200, errorRate: 0.001 }
```

---

## TypeScript

Full types included. No `@types/` package needed.

```ts
import { withLatency, LatencyProfile, PresetName } from 'slowdep';

const profile: LatencyProfile = { p50: 50, p99: 500, errorRate: 0.005 };
const slowFn = withLatency(myFn, profile);
```

---

## Who is this for?

- Backend engineers building resilient Node.js services
- Anyone writing retry logic, circuit breakers, or timeout handling
- Teams doing chaos engineering without a full infrastructure setup
- Claude Code and AI coding agents that scaffold retry/fallback logic and need to test it

---

## License

MIT
