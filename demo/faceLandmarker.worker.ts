import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import type { FaceLandmarkerResult } from 'aniface'

type WorkerInitMessage = {
  type: 'init'
  delegate: 'CPU' | 'GPU'
  wasmPath: string
  modelAssetPath: string
}

type WorkerDetectMessage = {
  type: 'detect'
  bitmap: ImageBitmap
  timestampMs: number
}

type WorkerDisposeMessage = {
  type: 'dispose'
}

type WorkerMessage = WorkerInitMessage | WorkerDetectMessage | WorkerDisposeMessage

type WorkerResultPayload = Pick<
  FaceLandmarkerResult,
  'faceLandmarks' | 'faceBlendshapes' | 'facialTransformationMatrixes'
>

let faceLandmarker: FaceLandmarker | null = null
let isInitialized = false

function toSerializableResult(result: FaceLandmarkerResult): WorkerResultPayload {
  return {
    faceLandmarks: result.faceLandmarks,
    faceBlendshapes: result.faceBlendshapes,
    facialTransformationMatrixes: result.facialTransformationMatrixes,
  }
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const data = event.data

  if (data.type === 'init') {
    try {
      const vision = await FilesetResolver.forVisionTasks(data.wasmPath)
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: data.modelAssetPath,
          delegate: data.delegate,
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
        numFaces: 1,
      })

      isInitialized = true
      self.postMessage({ type: 'ready' })
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return
  }

  if (data.type === 'dispose') {
    faceLandmarker?.close()
    faceLandmarker = null
    isInitialized = false
    self.postMessage({ type: 'disposed' })
    return
  }

  if (data.type === 'detect') {
    const { bitmap, timestampMs } = data

    try {
      if (!faceLandmarker || !isInitialized) {
        self.postMessage({ type: 'error', error: 'Worker landmarker is not initialized' })
        return
      }

      const startedAt = performance.now()
      const result = faceLandmarker.detectForVideo(bitmap, timestampMs)
      const inferenceTimeMs = performance.now() - startedAt

      self.postMessage({
        type: 'result',
        result: toSerializableResult(result),
        inferenceTimeMs,
        timestampMs,
      })
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      bitmap.close()
    }
  }
}
