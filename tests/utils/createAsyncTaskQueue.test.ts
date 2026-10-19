import { createAsyncTaskQueue } from "@/utils/createAsyncTaskQueue";

describe("createAsyncTaskQueue", () => {
  it("does not run queued tasks concurrently", async () => {
    const enqueue = createAsyncTaskQueue();
    let activeTasks = 0;
    let maxActiveTasks = 0;

    const runTask = async (value: number) => {
      activeTasks += 1;
      maxActiveTasks = Math.max(maxActiveTasks, activeTasks);
      await Promise.resolve();
      activeTasks -= 1;
      return value;
    };

    await expect(
      Promise.all([enqueue(() => runTask(1)), enqueue(() => runTask(2))]),
    ).resolves.toEqual([1, 2]);
    expect(maxActiveTasks).toBe(1);
  });

  it("continues processing after a task rejects", async () => {
    const enqueue = createAsyncTaskQueue();
    const first = enqueue(async () => {
      throw new Error("expected failure");
    });
    const second = enqueue(async () => "recovered");

    await expect(first).rejects.toThrow("expected failure");
    await expect(second).resolves.toBe("recovered");
  });
});
