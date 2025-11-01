/**
 * Purpose: Execute multiple API requests concurrently with batch support for performance optimization.
 */

/**
 * Purpose: Execute multiple promises concurrently with optional batch size limit.
 * Params:
 *   - requests: Promise<T>[] — Array of promises to execute
 *   - options.batchSize?: number — Number of promises to execute at once (default: 5)
 * Returns:
 *   - Promise<T[]> — Array of results in same order as input
 * Throws:
 *   - If any promise rejects, error is thrown immediately
 */
export async function concurrent<T>(
  requests: Promise<T>[],
  options?: { batchSize?: number }
): Promise<T[]> {
  const batchSize = options?.batchSize || 5;
  const results: T[] = [];

  if (requests.length === 0) {
    return [];
  }

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Purpose: Execute array of request functions concurrently with automatic retry on failure.
 * Params:
 *   - requestFunctions: Array<() => Promise<T>> — Array of functions that return promises
 *   - maxRetries: number — Number of retries on failure (default: 3)
 *   - backoffMultiplier: number — Exponential backoff multiplier (default: 2)
 * Returns:
 *   - Promise<T[]> — Array of results in same order as input
 * Throws:
 *   - If all retries fail for any request, error is thrown
 */
export async function concurrentWithRetry<T>(
  requestFunctions: Array<() => Promise<T>>,
  maxRetries: number = 3,
  backoffMultiplier: number = 2
): Promise<T[]> {
  const results: T[] = new Array(requestFunctions.length);
  const errors: Map<number, Error> = new Map();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const pendingRequests: Promise<void>[] = [];

    for (let i = 0; i < requestFunctions.length; i++) {
      if (results[i] !== undefined) {
        continue;
      }

      const request = requestFunctions[i]()
        .then((result) => {
          results[i] = result;
          errors.delete(i);
        })
        .catch((error) => {
          if (attempt === maxRetries) {
            errors.set(i, error);
          }
        });

      pendingRequests.push(request);
    }

    if (pendingRequests.length === 0) {
      break;
    }

    await Promise.all(pendingRequests);

    if (attempt < maxRetries && errors.size > 0) {
      const delay = Math.pow(backoffMultiplier, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (errors.size > 0) {
    const firstError = errors.values().next().value;
    throw firstError;
  }

  return results;
}

/**
 * Purpose: Execute multiple API requests with concurrent batching and timeout.
 * Params:
 *   - requests: Promise<T>[] — Array of promises
 *   - options.batchSize?: number — Batch size (default: 5)
 *   - options.timeoutMs?: number — Timeout per batch in milliseconds
 * Returns:
 *   - Promise<T[]> — Results array
 * Throws:
 *   - If timeout exceeded or promise rejects
 */
export async function concurrentWithTimeout<T>(
  requests: Promise<T>[],
  options?: { batchSize?: number; timeoutMs?: number }
): Promise<T[]> {
  const batchSize = options?.batchSize || 5;
  const timeoutMs = options?.timeoutMs || 30000;
  const results: T[] = [];

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);

    try {
      const batchResults = await Promise.race([
        Promise.all(batch),
        new Promise<T[]>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Request timeout after ${timeoutMs}ms`)),
            timeoutMs
          )
        ),
      ]);

      results.push(...batchResults);
    } catch (error) {
      throw error;
    }
  }

  return results;
}

/**
 * Purpose: Execute multiple API calls and return results with status (success/error).
 * Params:
 *   - requests: Promise<T>[] — Array of promises
 *   - options.batchSize?: number — Batch size (default: 5)
 * Returns:
 *   - Promise<{ success: T[]; failed: Error[] }> — Separated results and errors
 * Throws:
 *   - N/A (never throws, captures all errors)
 */
export async function concurrentSafe<T>(
  requests: Promise<T>[],
  options?: { batchSize?: number }
): Promise<{
  success: T[];
  failed: Array<{ index: number; error: Error }>;
}> {
  const batchSize = options?.batchSize || 5;
  const success: T[] = [];
  const failed: Array<{ index: number; error: Error }> = [];

  for (let batchStart = 0; batchStart < requests.length; batchStart += batchSize) {
    const batch = requests
      .slice(batchStart, batchStart + batchSize)
      .map((promise, relativeIndex) =>
        promise
          .then((result) => ({ index: batchStart + relativeIndex, result }))
          .catch((error) => ({ index: batchStart + relativeIndex, error }))
      );

    const batchResults = await Promise.all(batch);

    for (const item of batchResults) {
      if ('error' in item) {
        failed.push({ index: item.index, error: item.error });
      } else {
        success.push(item.result);
      }
    }
  }

  return { success, failed };
}

/**
 * Purpose: Execute requests with progress callback for UI feedback.
 * Params:
 *   - requests: Promise<T>[] — Array of promises
 *   - onProgress: (completed: number, total: number) => void — Progress callback
 *   - options.batchSize?: number — Batch size (default: 5)
 * Returns:
 *   - Promise<T[]> — Results array
 * Throws:
 *   - If any promise rejects
 */
export async function concurrentWithProgress<T>(
  requests: Promise<T>[],
  onProgress?: (completed: number, total: number) => void,
  options?: { batchSize?: number }
): Promise<T[]> {
  const batchSize = options?.batchSize || 5;
  const results: T[] = [];
  let completed = 0;
  const total = requests.length;

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch);

    results.push(...batchResults);

    completed += batch.length;
    onProgress?.(completed, total);
  }

  return results;
}
