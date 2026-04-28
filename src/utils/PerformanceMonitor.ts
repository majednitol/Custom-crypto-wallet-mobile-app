import { useEffect, useRef } from 'react';

/**
 * A custom hook to log when a component renders and how long it took.
 * @param componentName The name of the component to track.
 */
export function useRenderLog(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const duration = Date.now() - startTime.current;
    renderCount.current += 1;
    console.log(`[Perf] ${componentName} render #${renderCount.current} took ${duration}ms`);
    
    // Reset start time for next potential render (though useEffect runs after render)
    startTime.current = Date.now();
  });
}

/**
 * Measures the execution time of an async function.
 * @param label A label for the measurement.
 * @param fn The async function to execute.
 */
export async function measureTime<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const end = Date.now();
    console.log(`[Perf] ${label} took ${end - start}ms`);
    return result;
  } catch (error) {
    const end = Date.now();
    console.log(`[Perf] ${label} failed after ${end - start}ms`);
    throw error;
  }
}
