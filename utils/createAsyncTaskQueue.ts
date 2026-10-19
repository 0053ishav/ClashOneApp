/**
 * Serialize asynchronous tasks while allowing the queue to continue after a
 * task fails. Each caller still receives its own task's result or rejection.
 */
export function createAsyncTaskQueue() {
  let tail: Promise<void> = Promise.resolve();

  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = tail.then(task, task);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
