export interface LatencyProfile {
  p50: number;
  p95?: number;
  p99: number;
  errorRate?: number;
}

export type PresetName =
  | 'postgres' | 'mysql' | 'redis' | 'mongodb'
  | 'stripe' | 'openai' | 'anthropic'
  | 's3' | 'dynamodb' | 'http';

export declare const presets: Record<PresetName, Required<LatencyProfile>>;

export declare function withLatency<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  profile: PresetName | LatencyProfile
): T;

export declare function withLatencyAll<T extends object>(
  obj: T,
  profile: PresetName | LatencyProfile
): T;

export declare function slowmoDelay(profile: PresetName | LatencyProfile): Promise<void>;