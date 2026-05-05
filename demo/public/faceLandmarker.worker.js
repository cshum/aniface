const DEFAULT_VISION_BUNDLE_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/vision_bundle.cjs'

let faceLandmarker = null
let isInitialized = false
let visionRuntimePromise = null

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function toSerializableResult(result) {
  return {
    faceLandmarks: result.faceLandmarks,
    faceBlendshapes: result.faceBlendshapes,
    facialTransformationMatrixes: result.facialTransformationMatrixes,
  }
}

async function loadVisionRuntime(visionBundlePath) {
  if (!visionRuntimePromise) {
    visionRuntimePromise = fetch(visionBundlePath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load MediaPipe vision bundle: ${response.status}`)
        }

        return response.text()
      })
      .then((source) => {
        const exports = {}
        const module = { exports }
        const factory = new Function(
          'self',
          'exports',
          'module',
          `${source}\nreturn module.exports || exports;`
        )

        return factory(self, exports, module)
      })
      .then((vision) => {
        if (!vision?.FaceLandmarker || !vision?.FilesetResolver) {
          throw new Error('MediaPipe vision bundle did not expose FaceLandmarker runtime')
        }

        return vision
      })
  }

  return visionRuntimePromise
}

self.onmessage = async (event) => {
  const data = event.data

  if (data.type === 'init') {
    try {
      const vision = await loadVisionRuntime(data.visionBundlePath || DEFAULT_VISION_BUNDLE_PATH)
      const visionFiles = await vision.FilesetResolver.forVisionTasks(data.wasmPath)

      faceLandmarker = await vision.FaceLandmarker.createFromOptions(visionFiles, {
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
      self.postMessage({ type: 'error', error: getErrorMessage(error) })
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
      self.postMessage({ type: 'error', error: getErrorMessage(error) })
    } finally {
      bitmap.close()
    }
  }
}
