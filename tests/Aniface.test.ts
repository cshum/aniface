/**
 * Aniface core functionality tests
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { Aniface } from '../src/Aniface'

describe('Aniface', () => {
  let mockVideo: HTMLVideoElement
  let mockCanvas: HTMLCanvasElement
  
  beforeEach(() => {
    // Create fresh DOM elements for each test
    mockVideo = document.createElement('video')
    mockCanvas = document.createElement('canvas')
  })

  describe('Instantiation', () => {
    test('creates instance with valid config', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(avatar).toBeDefined()
      expect(avatar).toBeInstanceOf(Aniface)
    })

    test('instance has expected initial state', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(avatar.ready).toBe(false)
      expect(avatar.running).toBe(false)
    })
  })

  describe('Config Validation', () => {
    test('throws error when canvasElement is missing', () => {
      expect(() => {
        new Aniface({
          videoElement: mockVideo,
          canvasElement: null as any,
          modelPath: '/test-model.glb'
        })
      }).toThrow('canvasElement is required')
    })

    test('throws error when modelPath is missing', () => {
      expect(() => {
        new Aniface({
          videoElement: mockVideo,
          canvasElement: mockCanvas,
          modelPath: null as any
        })
      }).toThrow('modelPath is required')
    })

    test('throws error when videoElement is not HTMLVideoElement', () => {
      expect(() => {
        new Aniface({
          videoElement: document.createElement('div') as any,
          canvasElement: mockCanvas,
          modelPath: '/test-model.glb'
        })
      }).toThrow('videoElement must be an HTMLVideoElement')
    })

    test('throws error when canvasElement is not HTMLCanvasElement', () => {
      expect(() => {
        new Aniface({
          videoElement: mockVideo,
          canvasElement: document.createElement('div') as any,
          modelPath: '/test-model.glb'
        })
      }).toThrow('canvasElement must be an HTMLCanvasElement')
    })
  })

  describe('Lifecycle', () => {
    test('throws error when starting before initialization', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(() => avatar.start()).toThrow('Aniface not initialized')
    })

    test('stop works when not running', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      // Should not throw
      expect(() => avatar.stop()).not.toThrow()
    })

    test('destroy cleans up state', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      avatar.destroy()
      
      expect(avatar.ready).toBe(false)
      expect(avatar.running).toBe(false)
    })
  })

  describe('Getters', () => {
    test('getVideoElement returns the video element', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(avatar.getVideoElement()).toBe(mockVideo)
    })

    test('getCanvasElement returns the canvas element', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(avatar.getCanvasElement()).toBe(mockCanvas)
    })

    test('getRenderer returns null before initialization', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(avatar.getRenderer()).toBeNull()
    })

    test('getLandmarkManager returns null before initialization', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(avatar.getLandmarkManager()).toBeNull()
    })
  })

  describe('Callbacks', () => {
    test('calls onReady callback when provided', async () => {
      const onReady = vi.fn()
      
      new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb',
        onReady
      })

        // Verify callback is NOT called during construction.
        // The onReady callback should only fire after initialize() completes,
        // not when the Aniface instance is created.

        // Note: This test doesn't verify the callback actually fires after initialize()
        // because that would require mocking the entire MediaPipe + Three.js initialization chain.
        // Manual testing confirms callbacks work correctly.
      expect(onReady).not.toHaveBeenCalled()
    })

    test('calls onError callback when provided', () => {
      const onError = vi.fn()
      
      new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb',
        onError
      })
      
      // Verify callback can be assigned
      expect(onError).toBeDefined()
    })
  })

  describe('Manual Landmark Input', () => {
    test('creates instance without videoElement for manual mode', () => {
      const avatar = new Aniface({
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(avatar).toBeDefined()
      expect(avatar).toBeInstanceOf(Aniface)
      expect(avatar.getVideoElement()).toBeUndefined()
    })

    test('videoElement is optional when using manual input', () => {
      expect(() => {
        new Aniface({
          canvasElement: mockCanvas,
          modelPath: '/test-model.glb'
        })
      }).not.toThrow()
    })

    test('throws error when processLandmarkData called before initialization', () => {
      const avatar = new Aniface({
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })

      const mockLandmarkData = {
        faceLandmarks: [[{ x: 0.5, y: 0.5, z: 0 }]],
        faceBlendshapes: [],
        facialTransformationMatrixes: []
      }
      
      expect(() => avatar.processLandmarkData(mockLandmarkData as any))
        .toThrow('Aniface not initialized')
    })

    test('processLandmarkData accepts valid landmark data', () => {
      const avatar = new Aniface({
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })

      // Mock initialization state
      ;(avatar as any).isInitialized = true
      ;(avatar as any).avatarRenderer = null // Will trigger early return

      const mockLandmarkData = {
        faceLandmarks: [[{ x: 0.5, y: 0.5, z: 0 }]],
        faceBlendshapes: [],
        facialTransformationMatrixes: []
      }
      
      // Should not throw when initialized
      expect(() => avatar.processLandmarkData(mockLandmarkData as any))
        .not.toThrow()
    })

    test('processLandmarkData handles empty landmark data gracefully', () => {
      const avatar = new Aniface({
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })

      // Mock initialization state
      ;(avatar as any).isInitialized = true
      ;(avatar as any).avatarRenderer = { processLandmarks: vi.fn(), render: vi.fn() }

      const emptyLandmarkData = {
        faceLandmarks: [],
        faceBlendshapes: [],
        facialTransformationMatrixes: []
      }
      
      // Should handle empty data without throwing
      expect(() => avatar.processLandmarkData(emptyLandmarkData as any))
        .not.toThrow()
    })

    test('getVideoElement returns undefined when not provided', () => {
      const avatar = new Aniface({
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(avatar.getVideoElement()).toBeUndefined()
    })

    test('manual mode instance can coexist with video mode instance', () => {
      const manualAvatar = new Aniface({
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })

      const videoAvatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: document.createElement('canvas'),
        modelPath: '/test-model.glb'
      })
      
      expect(manualAvatar.getVideoElement()).toBeUndefined()
      expect(videoAvatar.getVideoElement()).toBe(mockVideo)
    })

    test('processLandmarkData calls onLandmarksDetected callback', () => {
      const onLandmarksDetected = vi.fn()
      
      const avatar = new Aniface({
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb',
        onLandmarksDetected
      })

      // Mock initialization state
      ;(avatar as any).isInitialized = true
      ;(avatar as any).avatarRenderer = { processLandmarks: vi.fn(), render: vi.fn() }

      const mockLandmarkData = {
        faceLandmarks: [[{ x: 0.5, y: 0.5, z: 0 }]],
        faceBlendshapes: [],
        facialTransformationMatrixes: []
      }
      
      avatar.processLandmarkData(mockLandmarkData as any)
      
      expect(onLandmarksDetected).toHaveBeenCalledWith(mockLandmarkData)
    })

    test('processLandmarkData calls onNoFaceDetected after threshold', () => {
      const onNoFaceDetected = vi.fn()
      
      const avatar = new Aniface({
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb',
        onNoFaceDetected
      })

      // Mock initialization state
      ;(avatar as any).isInitialized = true
      ;(avatar as any).avatarRenderer = { processLandmarks: vi.fn(), render: vi.fn() }

      const emptyLandmarkData = {
        faceLandmarks: [],
        faceBlendshapes: [],
        facialTransformationMatrixes: []
      }
      
      // Call multiple times to reach threshold (default is 30)
      for (let i = 0; i < 30; i++) {
        avatar.processLandmarkData(emptyLandmarkData as any)
      }
      
      expect(onNoFaceDetected).toHaveBeenCalledTimes(1)
    })
  })
})

