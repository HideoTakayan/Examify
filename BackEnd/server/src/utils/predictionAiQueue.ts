/** Giới hạn số lần gọi MiniMax song song (toàn server). */
export const PREDICTION_AI_MAX_CONCURRENT = 5;
export const PREDICTION_AI_TIMEOUT_MS = 120_000;

export class PredictionAiTimeoutError extends Error {
  readonly status = 408;
  constructor() {
    super("AI dự đoán quá thời gian chờ (120s). Vui lòng thử lại sau.");
    this.name = "PredictionAiTimeoutError";
  }
}

let active = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < PREDICTION_AI_MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      active += 1;
      resolve();
    });
  });
}

function release(): void {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) next();
}

/** Chạy fn trong slot; toàn bộ fn (gồm gọi MiniMax) timeout sau 120s. */
export async function runWithPredictionAiSlot<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new PredictionAiTimeoutError()), PREDICTION_AI_TIMEOUT_MS);
    });
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
    release();
  }
}

export function getPredictionAiQueueStats(): { active: number; waiting: number; max: number } {
  return { active, waiting: waiters.length, max: PREDICTION_AI_MAX_CONCURRENT };
}
