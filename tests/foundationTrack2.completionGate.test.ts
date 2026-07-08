import { describe, expect, it } from 'vitest';
import * as foundation from '../src/index';

describe('foundation track 2 completion gate', () => {
  it('exposes all expected public APIs for track 2 deliverables', () => {
    expect(typeof foundation.createQueryHookContract).toBe('function');
    expect(typeof foundation.createQueryCacheKey).toBe('function');
    expect(typeof foundation.createInMemoryCacheAdapter).toBe('function');

    expect(typeof foundation.applyOptimisticCacheUpdate).toBe('function');
    expect(typeof foundation.commitOptimisticCacheUpdate).toBe('function');
    expect(typeof foundation.rollbackOptimisticCacheUpdate).toBe('function');

    expect(typeof foundation.createOfflineQueue).toBe('function');
    expect(typeof foundation.replayOfflineQueue).toBe('function');

    expect(typeof foundation.createMutationLifecycle).toBe('function');
  });

  it('validates integrated query and mutation lifecycle behavior through public exports', async () => {
    const queryContract = foundation.createQueryHookContract<{ id: string }, { id: string; status: string }>({
      key: 'users.byId',
      run: (request) =>
        Promise.resolve({
          data: { id: request.params.id, status: 'idle' },
          receivedAtUtc: new Date(0).toISOString(),
        }),
    });

    const cache = foundation.createInMemoryCacheAdapter<{ id: string; status: string }>();
    const cacheKey = foundation.createQueryCacheKey(queryContract.key, { id: 'u1' });

    const response = await queryContract.run({
      key: queryContract.key,
      params: { id: 'u1' },
    });

    cache.set(cacheKey, { value: response.data, createdAtEpochMs: 100 });

    const lifecycle = foundation.createMutationLifecycle<{ id: string; status: string }, string>({
      key: cacheKey,
      nowEpochMs: (() => {
        let now = 200;
        return () => {
          now += 1;
          return now;
        };
      })(),
    });

    const optimisticSession = foundation.applyOptimisticCacheUpdate(
      cache,
      cacheKey,
      { id: 'u1', status: 'saving' },
      { nowEpochMs: 201 }
    );

    lifecycle.applyOptimistic({ id: 'u1', status: 'saving' });

    const queue = foundation.createOfflineQueue<{ id: string; status: string }>({
      nowEpochMs: () => 300,
      idFactory: () => 'queued-u1',
    });

    queue.enqueue({ key: cacheKey, payload: { id: 'u1', status: 'saved' } });

    const replay = await foundation.replayOfflineQueue({
      queue,
      process: (item) => {
        foundation.commitOptimisticCacheUpdate(
          cache,
          optimisticSession,
          { id: item.payload.id, status: item.payload.status },
          { nowEpochMs: 202 }
        );

        lifecycle.commit({ id: item.payload.id, status: item.payload.status });
        return Promise.resolve();
      },
    });

    expect(replay).toEqual({ processed: 1, failed: 0, remaining: 0 });
    expect(cache.get(cacheKey)?.value).toEqual({ id: 'u1', status: 'saved' });
    expect(lifecycle.getState().status).toBe('committed');

    const events = lifecycle.listEvents().map((event) => event.type);
    expect(events).toEqual(['optimistic-applied', 'committed']);

    foundation.rollbackOptimisticCacheUpdate(cache, optimisticSession);
    expect(cache.get(cacheKey)?.value).toEqual({ id: 'u1', status: 'idle' });
  });
});
