import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { WorkerFacialLandmarkManager } from '../src'

const mockResult = {
  faceLandmarks: [[{ x: 0.1, y: 0.2, z: 0.3 }]],
  faceBlendshapes: [],
  facialTransformationMatrixes: [],
}

class MockWorker {
  private listeners = new Set<(event: MessageEvent<any>) => void>()

  addEventListener = vi.fn((type: string, listener: (event: MessageEvent<any>) => void) => {
    if (type === 'message') {
      this.listeners.add(listener)
    }
  })

  removeEventListener = vi.fn((type: string, listener: (event: MessageEvent<any>) => void) => {
    if (type === 'message') {
      this.listeners.delete(listener)
    }
  })

  postMessage = vi.fn((message: { type: string; timestampMs?: number }) => {
    queueMicrotask(() => {
      if (message.type === 'init') {
        this.emit({ type: 'ready' })
      }

      if (message.type === 'detect') {
        this.emit({
          type: 'result',
          result: mockResult,
          inferenceTimeMs: 3.2,
          timestampMs: message.timestampMs ?? 0,
        })
      }

      if (message.type === 'dispose') {
        this.emit({ type: 'disposed' })
      }
    })
  })

  terminate = vi.fn()

  private emit(data: unknown): void {
    for (const listener of this.listeners) {
      listener({ data } as MessageEvent<any>)
    }
  }
}

describe('WorkerFacialLandmarkManager', () => {
  const originalCreateImageBitmap = globalThis.createImageBitmap

  beforeEach(() => {
    vi.restoreAllMocks()
    globalThis.createImageBitmap = vi.fn(async () => ({ close: vi.fn() } as unknown as ImageBitmap))
  })

  test('initializes using the provided worker factory', async () => {
    const worker = new MockWorker()
    const manager = new WorkerFacialLandmarkManager({
      worker: {
        createWorker: () => worker as unknown as Worker,
      },
    })

    await manager.initialize()

    expect(manager.isReady()).toBe(true)
    expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'init' }))
  })

  test('skips frames while a worker detection is already in flight', async () => {
    const worker = new MockWorker()
    const manager = new WorkerFacialLandmarkManager({
      worker: {
        createWorker: () => worker as unknown as Worker,
      },
    })
    const video = document.createElement('video')

    await manager.initialize()

    const firstDetection = manager.detectLandmarks(video)
    const secondDetection = manager.detectLandmarks(video)

    expect(firstDetection).toBeInstanceOf(Promise)
    expect(secondDetection).toBeUndefined()

    const result = await firstDetection
    expect(result?.faceLandmarks.length).toBe(1)
  })

  test('destroy terminates the worker', async () => {
    const worker = new MockWorker()
    const manager = new WorkerFacialLandmarkManager({
      worker: {
        createWorker: () => worker as unknown as Worker,
      },
    })

    await manager.initialize()
    manager.destroy()

    expect(worker.terminate).toHaveBeenCalled()
    expect(manager.isReady()).toBe(false)
  })

  afterEach(() => {
    globalThis.createImageBitmap = originalCreateImageBitmap
  })
})
