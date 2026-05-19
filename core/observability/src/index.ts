import type { OperationalContext } from "@atlas/core-shared";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogRecord {
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: OperationalContext;
  readonly attributes?: Record<string, unknown>;
  readonly timestamp: string;
}

export interface MetricsSnapshot {
  readonly counters: Record<string, number>;
  readonly gauges: Record<string, number>;
}

export class Telemetry {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  readonly logs: LogRecord[] = [];

  increment(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + value);
  }

  gauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  log(level: LogLevel, message: string, context?: OperationalContext, attributes?: Record<string, unknown>): void {
    this.logs.push({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context ? { context } : {}),
      ...(attributes ? { attributes } : {})
    });
  }

  snapshot(): MetricsSnapshot {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges)
    };
  }
}
