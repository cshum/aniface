/**
 * WorkerFacialLandmarkManager - Runs MediaPipe Face Landmarker in a Web Worker
 */

import {
  DrawingUtils,
  FaceLandmarker,
  FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'
import type { FacialLandmarkManagerConfig } from './FacialLandmarkManager.js'

type WorkerFaceLandmarkerResult = Pick<
  FaceLandmarkerResult,
  'faceLandmarks' | 'faceBlendshapes' | 'facialTransformationMatrixes'
>

type WorkerInitMessage = {
  type: 'init'
  delegate: 'CPU' | 'GPU'
  modelAssetPath: string
  wasmPath: string
  outputFaceBlendshapes: boolean
  outputFacialTransformationMatrixes: boolean
}

type WorkerDetectMessage = {
  type: 'detect'
  bitmap: ImageBitmap
  timestampMs: number
}

type WorkerDisposeMessage = {
  type: 'dispose'
}

type WorkerResponse =
  | { type: 'ready' }
  | { type: 'disposed' }
  | { type: 'error'; error: string }
  | {
      type: 'result'
      result: WorkerFaceLandmarkerResult
      inferenceTimeMs: number
      timestampMs: number
    }

export class WorkerFacialLandmarkManager {
  private worker: Worker | null = null
  private isInitialized = false
  private results: FaceLandmarkerResult | null = null
  private isDetecting = false
  private config: FacialLandmarkManagerConfig
  private initPromise: Promise<void> | null = null
  private pendingInitResolve: (() => void) | null = null
  private pendingInitReject: ((error: Error) => void) | null = null
  private pendingDetectResolve: ((result: FaceLandmarkerResult | undefined) => void) | null = null
  private pendingDetectReject: ((error: Error) => void) | null = null

  constructor(config: FacialLandmarkManagerConfig = {}) {
    this.config = {
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      delegate: 'GPU',
      runtime: 'worker',
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      wasmPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      ...config,
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    if (this.initPromise) {
      return this.initPromise
    }

    const createWorker = this.config.worker?.createWorker

    if (!createWorker && typeof Worker === 'undefined') {
      throw new Error('Web Workers are not available in this environment')
    }

    this.worker = createWorker?.() ?? new Worker(
      new URL('../workers/faceLandmarker.worker.js', import.meta.url),
      { type: 'classic' }
    )
    this.worker.addEventListener('message', this.handleWorkerMessage)

    this.initPromise = new Promise<void>((resolve, reject) => {
      this.pendingInitResolve = resolve
      this.pendingInitReject = reject
    })

    this.worker.postMessage({
      type: 'init',
      delegate: this.config.delegate!,
      modelAssetPath: this.config.modelAssetPath!,
      wasmPath: this.config.wasmPath!,
      outputFaceBlendshapes: this.config.outputFaceBlendshapes!,
      outputFacialTransformationMatrixes: this.config.outputFacialTransformationMatrixes!,
    } satisfies WorkerInitMessage)

    return this.initPromise
  }

  detectLandmarks(
    videoElement: HTMLVideoElement,
    timestamp?: number
  ): Promise<FaceLandmarkerResult | undefined> | undefined {
    if (!this.worker || !this.isInitialized) {
      console.warn('WorkerFacialLandmarkManager not initialized yet')
      return undefined
    }

    if (this.isDetecting) {
      return undefined
    }

    if (!videoElement || videoElement.readyState < 2) {
      console.warn('Video element not ready for landmark detection')
      return undefined
    }

    if (typeof createImageBitmap !== 'function') {
      console.warn('createImageBitmap is not available in this environment')
      return undefined
    }

    this.isDetecting = true
    const timestampMs = timestamp ?? performance.now()

    return createImageBitmap(videoElement)
      .then((bitmap) => {
        if (!this.worker) {
          this.isDetecting = false
          bitmap.close()
          return undefined
        }

        const detectPromise = new Promise<FaceLandmarkerResult | undefined>((resolve, reject) => {
          this.pendingDetectResolve = resolve
          this.pendingDetectReject = reject
        })

        this.worker.postMessage({
          type: 'detect',
          bitmap,
          timestampMs,
        } satisfies WorkerDetectMessage, [bitmap])

        return detectPromise
      })
      .catch((error) => {
        this.isDetecting = false
        console.error('Error sending frame to worker:', error)
        return undefined
      })
  }

  getResults(): FaceLandmarkerResult | null {
    return this.results
  }

  isReady(): boolean {
    return this.isInitialized && this.worker !== null
  }

  drawLandmarks(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')
    if (!ctx || !this.results?.faceLandmarks) return

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const drawingUtils = new DrawingUtils(ctx)
    const lineWidth = 1.3

    for (const landmarks of this.results.faceLandmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_TESSELATION,
        { color: '#C0C0C070', lineWidth }
      )

      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
        { color: '#FF3030', lineWidth }
      )

      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
        { color: '#FF3030', lineWidth }
      )

      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
        { color: '#30FF30', lineWidth }
      )

      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
        { color: '#30FF30', lineWidth }
      )

      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
        { color: '#E0E0E0', lineWidth }
      )

      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LIPS,
        { color: '#E0E0E0', lineWidth }
      )

      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
        { color: '#FF3030', lineWidth }
      )

      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
        { color: '#30FF30', lineWidth }
      )
    }
  }

  destroy(): void {
    this.pendingInitResolve = null
    this.pendingInitReject = null

    if (this.pendingDetectResolve) {
      this.pendingDetectResolve(undefined)
      this.pendingDetectResolve = null
      this.pendingDetectReject = null
    }

    if (this.worker) {
      this.worker.postMessage({ type: 'dispose' } satisfies WorkerDisposeMessage)
      this.worker.removeEventListener('message', this.handleWorkerMessage)
      this.worker.terminate()
      this.worker = null
    }

    this.results = null
    this.isInitialized = false
    this.isDetecting = false
    this.initPromise = null
  }

  private handleWorkerMessage = (event: MessageEvent<WorkerResponse>): void => {
    const data = event.data

    if (data.type === 'ready') {
      this.isInitialized = true
      this.pendingInitResolve?.()
      this.pendingInitResolve = null
      this.pendingInitReject = null
      this.initPromise = null
      console.log('✅ WorkerFacialLandmarkManager initialized successfully')
      return
    }

    if (data.type === 'disposed') {
      this.isInitialized = false
      this.isDetecting = false
      return
    }

    if (data.type === 'error') {
      const error = new Error(data.error)

      if (this.pendingInitReject) {
        this.pendingInitReject(error)
        this.pendingInitResolve = null
        this.pendingInitReject = null
        this.initPromise = null
      } else if (this.pendingDetectReject) {
        this.pendingDetectReject(error)
        this.pendingDetectResolve = null
        this.pendingDetectReject = null
      } else {
        console.error('Error in WorkerFacialLandmarkManager:', error)
      }

      this.isDetecting = false
      return
    }

    this.results = data.result as FaceLandmarkerResult
    this.pendingDetectResolve?.(this.results)
    this.pendingDetectResolve = null
    this.pendingDetectReject = null
    this.isDetecting = false
  }
}
