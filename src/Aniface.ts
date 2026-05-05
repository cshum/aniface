/**
 * Main Aniface class - Entry point for the library
 */

import type { AnifaceConfig } from './types.js'
import { FacialLandmarkManager } from './core/FacialLandmarkManager.js'
import { WorkerFacialLandmarkManager } from './core/WorkerFacialLandmarkManager.js'
import { AvatarRenderer } from './core/AvatarRenderer.js'
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'

/**
 * Aniface - Animate 3D avatars with real-time facial tracking
 * 
 * This is the main class that brings together facial landmark detection,
 * 3D rendering, and blendshape animation into a simple, unified API.
 * 
 * Supports two input modes:
 * 1. Built-in MediaPipe detection (provide videoElement, call start())
 * 2. Manual landmark updates (call processLandmarkData() when you have data)
 * 
 * @example Built-in MediaPipe detection
 * ```typescript
 * const avatar = new Aniface({
 *   videoElement: document.getElementById('webcam') as HTMLVideoElement,
 *   canvasElement: document.getElementById('avatar') as HTMLCanvasElement,
 *   modelPath: '/models/avatar.glb'
 * })
 * await avatar.initialize()
 * avatar.start() // Automatic processing loop
 * ```
 * 
 * @example Manual updates (event-driven)
 * ```typescript
 * const avatar = new Aniface({
 *   canvasElement: document.getElementById('avatar') as HTMLCanvasElement,
 *   modelPath: '/models/avatar.glb'
 * })
 * await avatar.initialize()
 * 
 * // Push data when events occur
 * socket.on('landmarks', (data) => {
 *   avatar.processLandmarkData(data)
 * })
 * ```
 */
export class Aniface {
  private config: AnifaceConfig
  private landmarkManager: FacialLandmarkManager | WorkerFacialLandmarkManager | null = null
  private avatarRenderer: AvatarRenderer | null = null
  private isRunning: boolean = false
  private isInitialized: boolean = false
  private animationFrameId: number | null = null
  private noFaceDetectedCount: number = 0
  private readonly NO_FACE_THRESHOLD = 5 // Frames before triggering callback

  constructor(config: AnifaceConfig) {
    this.config = config
    this.validateConfig()
  }

  /**
   * Validate the configuration
   */
  private validateConfig(): void {
    // Canvas element is always required
    if (!this.config.canvasElement) {
      throw new Error('canvasElement is required')
    }
    if (!(this.config.canvasElement instanceof HTMLCanvasElement)) {
      throw new Error('canvasElement must be an HTMLCanvasElement')
    }
    
    // Model path is always required
    if (!this.config.modelPath) {
      throw new Error('modelPath is required')
    }
    
    // Validate video element if provided
    if (this.config.videoElement && !(this.config.videoElement instanceof HTMLVideoElement)) {
      throw new Error('videoElement must be an HTMLVideoElement')
    }
  }

  /**
   * Initialize the avatar system
   * Must be called before start()
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Aniface already initialized')
      return
    }

    try {
      console.log('🎭 Initializing Aniface...')
      
      // Initialize landmark manager only if video element is provided
      // Skip if user will provide landmark data manually via processLandmarkData()
      if (this.config.videoElement) {
        this.landmarkManager = this.config.landmarkConfig?.runtime === 'worker'
          ? new WorkerFacialLandmarkManager(this.config.landmarkConfig)
          : new FacialLandmarkManager(this.config.landmarkConfig)
        await this.landmarkManager.initialize()
        console.log('✅ Landmark manager initialized')
      } else {
        console.log('ℹ️  No video element provided - use processLandmarkData() for manual updates')
      }
      
      // Initialize avatar renderer (always needed)
      this.avatarRenderer = new AvatarRenderer({
        canvas: this.config.canvasElement,
        modelPath: this.config.modelPath,
        cameraConfig: this.config.cameraConfig,
        lightingConfig: this.config.lightingConfig,
        blendshapeMultipliers: this.config.blendshapeMultipliers,
        modelOptions: this.config.modelOptions
      })

      // Sets up Three.js scene and loads avatar
      await this.avatarRenderer.initialize()
      console.log('✅ Avatar renderer initialized')
      
      this.isInitialized = true
      console.log('✅ Aniface initialized successfully')
      
      // Call ready callback
      if (this.config.onReady) {
        this.config.onReady()
      }
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error('❌ Failed to initialize Aniface:', err)
      
      // Cleanup any partially initialized resources to prevent memory leaks
      this.cleanupResources()
      
      if (this.config.onError) {
        this.config.onError(err)
      }
      
      throw err
    }
  }

  /**
   * Cleanup all resources and reset state
   * Used during initialization failure and destruction
   */
  private cleanupResources(): void {
    if (this.landmarkManager) {
      this.landmarkManager.destroy()
      this.landmarkManager = null
    }
    
    if (this.avatarRenderer) {
      this.avatarRenderer.destroy()
      this.avatarRenderer = null
    }
    
    this.isInitialized = false
  }

  /**
   * Start avatar processing
   * Begins the facial tracking and animation loop
   */
  start(): void {
    if (!this.isInitialized) {
      throw new Error('Aniface not initialized. Call initialize() first.')
    }
    
    if (this.isRunning) {
      console.warn('Avatar is already running')
      return
    }
    
    this.isRunning = true
    this.processFrame()
    console.log('▶️  Avatar started')
  }

  /**
   * Stop avatar processing
   * Pauses the facial tracking loop
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('Avatar is not running')
      return
    }
    
    this.isRunning = false
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    
    console.log('⏸️  Avatar stopped')
  }

  /**
   * Main processing loop - detects landmarks and updates avatar
   */
  private processFrame(): void {
    if (!this.isRunning) return
    
    this.animationFrameId = requestAnimationFrame(() => this.processFrame())
    
    if (!this.avatarRenderer) {
      return
    }
    
    try {
      // Use built-in MediaPipe detection
      if (this.landmarkManager && this.config.videoElement) {
        const detection = this.landmarkManager.detectLandmarks(this.config.videoElement)

        if (detection instanceof Promise) {
          void detection
            .then((results) => {
              if (!this.isRunning) {
                return
              }

              this.handleDetectionResults(results)
            })
            .catch((error) => {
              console.error('Error processing frame:', error)

              if (this.config.onError && error instanceof Error) {
                this.config.onError(error)
              }
            })
        } else {
          this.handleDetectionResults(detection)
        }
      }
      
      // Render the scene
      this.avatarRenderer.render()
      
    } catch (error) {
      console.error('Error processing frame:', error)
      
      if (this.config.onError && error instanceof Error) {
        this.config.onError(error)
      }
    }
  }

  /**
   * Process facial landmark data directly without using the animation loop
   * Use this for push-based updates (e.g., WebSocket events, button clicks)
   * 
   * @param landmarkData - FaceLandmarkerResult from MediaPipe or compatible format
   * 
   * @example
   * ```typescript
   * // Push-based: Receive landmark data from WebSocket
   * socket.on('landmarks', (data) => {
   *   avatar.processLandmarkData(data)
   * })
   * 
   * // Push-based: Update on button click
   * button.onclick = () => {
   *   const data = getPrerecordedLandmark()
   *   avatar.processLandmarkData(data)
   * }
   * ```
   */
  processLandmarkData(landmarkData: import('@mediapipe/tasks-vision').FaceLandmarkerResult): void {
    if (!this.isInitialized) {
      throw new Error('Aniface not initialized. Call initialize() first.')
    }
    
    if (!this.avatarRenderer) {
      console.warn('Avatar renderer not ready')
      return
    }
    
    try {
      this.applyLandmarkData(landmarkData, true)
    } catch (error) {
      console.error('Error processing landmark data:', error)
      
      if (this.config.onError && error instanceof Error) {
        this.config.onError(error)
      }
    }
  }

  /**
   * Update canvas size (call when window is resized)
   */
  updateSize(width: number, height: number): void {
    if (this.avatarRenderer) {
      this.avatarRenderer.updateSize(width, height)
    }
  }

  /**
   * Get the current video element (if provided)
   */
  getVideoElement(): HTMLVideoElement | undefined {
    return this.config.videoElement
  }

  /**
   * Get the current canvas element
   */
  getCanvasElement(): HTMLCanvasElement {
    return this.config.canvasElement
  }

  /**
   * Get the avatar renderer instance (for advanced usage)
   */
  getRenderer(): AvatarRenderer | null {
    return this.avatarRenderer
  }

  /**
   * Get the landmark manager instance (for advanced usage)
   */
  getLandmarkManager(): FacialLandmarkManager | WorkerFacialLandmarkManager | null {
    return this.landmarkManager
  }

  /**
   * Check if avatar is currently running
   */
  get running(): boolean {
    return this.isRunning
  }

  /**
   * Check if avatar system is initialized
   */
  get ready(): boolean {
    return this.isInitialized
  }

  /**
   * Destroy avatar and cleanup resources
   * Call this when you're done with the avatar
   */
  destroy(): void {
    console.log('🧹 Destroying Aniface...')
    
    this.stop()
    this.cleanupResources()
    
    console.log('✅ Aniface destroyed')
  }

  private handleDetectionResults(results: FaceLandmarkerResult | undefined): void {
    if (!results) {
      return
    }

    try {
      this.applyLandmarkData(results, false)
    } catch (error) {
      console.error('Error processing frame:', error)

      if (this.config.onError && error instanceof Error) {
        this.config.onError(error)
      }
    }
  }

  private applyLandmarkData(landmarkData: FaceLandmarkerResult, renderScene: boolean): void {
    if (!landmarkData.faceLandmarks || landmarkData.faceLandmarks.length === 0) {
      console.warn('No face landmarks in provided data')
      this.noFaceDetectedCount++

      if (this.noFaceDetectedCount === this.NO_FACE_THRESHOLD && this.config.onNoFaceDetected) {
        this.config.onNoFaceDetected()
      }
      return
    }

    this.noFaceDetectedCount = 0
    this.avatarRenderer?.processLandmarks(landmarkData)

    if (this.config.onLandmarksDetected) {
      this.config.onLandmarksDetected(landmarkData)
    }

    if (renderScene) {
      this.avatarRenderer?.render()
    }
  }
}

