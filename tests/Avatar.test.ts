/**
 * Avatar class tests - specifically for axis mapping and rotation
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { Avatar } from '../src/core/Avatar'
import * as THREE from 'three'

describe('Avatar', () => {
  let scene: THREE.Scene
  
  beforeEach(() => {
    scene = new THREE.Scene()
  })

  describe('Axis Mapping Options', () => {
    test('creates Avatar with standard axis mapping', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'standard',
        fullBodyAvatar: true
      })
      
      expect(avatar).toBeDefined()
    })

    test('creates Avatar with quickrig axis mapping', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'quickrig',
        fullBodyAvatar: true
      })
      
      expect(avatar).toBeDefined()
    })

    test('defaults to standard axis mapping when not specified', () => {
      const avatar = new Avatar('/test-model.glb', scene)
      
      expect(avatar).toBeDefined()
      // Internal check: the options should have axisMapping set to 'standard'
      expect((avatar as any).options.axisMapping).toBe('standard')
    })

    test('standard mapping option is preserved', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'standard'
      })
      
      expect((avatar as any).options.axisMapping).toBe('standard')
    })

    test('quickrig mapping option is preserved', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'quickrig'
      })
      
      expect((avatar as any).options.axisMapping).toBe('quickrig')
    })

    test('axis mapping works with other options', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'quickrig',
        center: true,
        autoRotate: false,
        rotation: 0,
        scale: 1.5,
        position: [0, -0.5, 0],
        fullBodyAvatar: true
      })
      
      expect(avatar).toBeDefined()
      expect((avatar as any).options.axisMapping).toBe('quickrig')
      expect((avatar as any).options.fullBodyAvatar).toBe(true)
      expect((avatar as any).options.scale).toBe(1.5)
    })
  })

  describe('Axis Mapping Rotation Application', () => {
    test('standard mapping applies rotations to correct axes', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'standard',
        fullBodyAvatar: true
      })

      // Mock head bone and set loaded state
      const mockHeadBone = new THREE.Bone()
      mockHeadBone.name = 'Head'
      ;(avatar as any).headBone = mockHeadBone
      ;(avatar as any).loaded = true
      
      // Mock GLTF scene
      const mockGLTFScene = new THREE.Group()
      ;(avatar as any).gltf = { scene: mockGLTFScene }

      // Create a test transformation matrix
      const matrix = new THREE.Matrix4()
      const euler = new THREE.Euler(0.5, 0.3, 0.2) // pitch=0.5, yaw=0.3, roll=0.2
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(euler)
      const position = new THREE.Vector3(0, 0, 0)
      const scale = new THREE.Vector3(1, 1, 1)
      matrix.compose(position, quaternion, scale)

      // Apply matrix
      avatar.applyMatrix(matrix, { scale: 1 })

      // For standard mapping: rotation.set(x, y, z) where x=pitch, y=yaw, z=roll
      // With mirroring: y and z are negated
      expect(mockHeadBone.rotation.x).toBeCloseTo(0.5, 1) // pitch
      expect(mockHeadBone.rotation.y).toBeCloseTo(-0.3, 1) // yaw (mirrored)
      expect(mockHeadBone.rotation.z).toBeCloseTo(-0.2, 1) // roll (mirrored)
    })

    test('quickrig mapping applies rotations to swapped axes', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'quickrig',
        fullBodyAvatar: true
      })

      // Mock head bone and set loaded state
      const mockHeadBone = new THREE.Bone()
      mockHeadBone.name = 'QuickRigCharacter_Head'
      ;(avatar as any).headBone = mockHeadBone
      ;(avatar as any).loaded = true
      
      // Mock GLTF scene
      const mockGLTFScene = new THREE.Group()
      ;(avatar as any).gltf = { scene: mockGLTFScene }

      // Create a test transformation matrix
      const matrix = new THREE.Matrix4()
      const euler = new THREE.Euler(0.5, 0.3, 0.2) // pitch=0.5, yaw=0.3, roll=0.2
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(euler)
      const position = new THREE.Vector3(0, 0, 0)
      const scale = new THREE.Vector3(1, 1, 1)
      matrix.compose(position, quaternion, scale)

      // Apply matrix
      avatar.applyMatrix(matrix, { scale: 1 })

      // For quickrig mapping: rotation.set(y, z, x) where x=yaw, y=roll, z=pitch
      // With mirroring: y and z are negated
      expect(mockHeadBone.rotation.x).toBeCloseTo(-0.3, 1) // yaw (from y, mirrored)
      expect(mockHeadBone.rotation.y).toBeCloseTo(-0.2, 1) // roll (from z, mirrored)
      expect(mockHeadBone.rotation.z).toBeCloseTo(0.5, 1)  // pitch (from x)
    })

    test('neck bone receives cascaded rotation with standard mapping', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'standard',
        fullBodyAvatar: true
      })

      // Mock head and neck bones and set loaded state
      const mockHeadBone = new THREE.Bone()
      mockHeadBone.name = 'Head'
      const mockNeckBone = new THREE.Bone()
      mockNeckBone.name = 'Neck'
      ;(avatar as any).headBone = mockHeadBone
      ;(avatar as any).neckBone = mockNeckBone
      ;(avatar as any).loaded = true
      
      // Mock GLTF scene
      const mockGLTFScene = new THREE.Group()
      ;(avatar as any).gltf = { scene: mockGLTFScene }

      // Create a test transformation matrix
      const matrix = new THREE.Matrix4()
      const euler = new THREE.Euler(0.5, 0.3, 0.2)
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(euler)
      const position = new THREE.Vector3(0, 0, 0)
      const scale = new THREE.Vector3(1, 1, 1)
      matrix.compose(position, quaternion, scale)

      // Apply matrix
      avatar.applyMatrix(matrix, { scale: 1 })

      // Neck should get 20% of rotation with offset on pitch
      // Standard: rotation.set(x/5 + 0.3, y/5, z/5)
      expect(mockNeckBone.rotation.x).toBeCloseTo(0.5/5 + 0.3, 1) // pitch with offset
      expect(mockNeckBone.rotation.y).toBeCloseTo(-0.3/5, 1) // yaw (mirrored)
      expect(mockNeckBone.rotation.z).toBeCloseTo(-0.2/5, 1) // roll (mirrored)
    })

    test('neck bone receives cascaded rotation with quickrig mapping', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'quickrig',
        fullBodyAvatar: true
      })

      // Mock head and neck bones and set loaded state
      const mockHeadBone = new THREE.Bone()
      mockHeadBone.name = 'QuickRigCharacter_Head'
      const mockNeckBone = new THREE.Bone()
      mockNeckBone.name = 'QuickRigCharacter_Neck'
      ;(avatar as any).headBone = mockHeadBone
      ;(avatar as any).neckBone = mockNeckBone
      ;(avatar as any).loaded = true
      
      // Mock GLTF scene
      const mockGLTFScene = new THREE.Group()
      ;(avatar as any).gltf = { scene: mockGLTFScene }

      // Create a test transformation matrix
      const matrix = new THREE.Matrix4()
      const euler = new THREE.Euler(0.5, 0.3, 0.2)
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(euler)
      const position = new THREE.Vector3(0, 0, 0)
      const scale = new THREE.Vector3(1, 1, 1)
      matrix.compose(position, quaternion, scale)

      // Apply matrix
      avatar.applyMatrix(matrix, { scale: 1 })

      // Neck should get 20% of rotation
      // QuickRig: rotation.set(y/5, z/5, x/5 + 0.3)
      expect(mockNeckBone.rotation.x).toBeCloseTo(-0.3/5, 1) // yaw (mirrored)
      expect(mockNeckBone.rotation.y).toBeCloseTo(-0.2/5, 1) // roll (mirrored)
      expect(mockNeckBone.rotation.z).toBeCloseTo(0.5/5 + 0.3, 1) // pitch with offset
    })

    test('spine2 bone receives subtle rotation with standard mapping', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'standard',
        fullBodyAvatar: true
      })

      // Mock bones and set loaded state
      const mockHeadBone = new THREE.Bone()
      const mockSpine2Bone = new THREE.Bone()
      mockSpine2Bone.name = 'Spine2'
      ;(avatar as any).headBone = mockHeadBone
      ;(avatar as any).spine2Bone = mockSpine2Bone
      ;(avatar as any).loaded = true
      
      // Mock GLTF scene
      const mockGLTFScene = new THREE.Group()
      ;(avatar as any).gltf = { scene: mockGLTFScene }

      // Create a test transformation matrix
      const matrix = new THREE.Matrix4()
      const euler = new THREE.Euler(0.5, 0.3, 0.2)
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(euler)
      const position = new THREE.Vector3(0, 0, 0)
      const scale = new THREE.Vector3(1, 1, 1)
      matrix.compose(position, quaternion, scale)

      // Apply matrix
      avatar.applyMatrix(matrix, { scale: 1 })

      // Spine2 should get 10% of rotation
      // Standard: rotation.set(x/10, y/10, z/10)
      expect(mockSpine2Bone.rotation.x).toBeCloseTo(0.5/10, 1) // pitch
      expect(mockSpine2Bone.rotation.y).toBeCloseTo(-0.3/10, 1) // yaw (mirrored)
      expect(mockSpine2Bone.rotation.z).toBeCloseTo(-0.2/10, 1) // roll (mirrored)
    })

    test('spine2 bone receives subtle rotation with quickrig mapping', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'quickrig',
        fullBodyAvatar: true
      })

      // Mock bones and set loaded state
      const mockHeadBone = new THREE.Bone()
      const mockSpine2Bone = new THREE.Bone()
      mockSpine2Bone.name = 'QuickRigCharacter_Spine2'
      ;(avatar as any).headBone = mockHeadBone
      ;(avatar as any).spine2Bone = mockSpine2Bone
      ;(avatar as any).loaded = true
      
      // Mock GLTF scene
      const mockGLTFScene = new THREE.Group()
      ;(avatar as any).gltf = { scene: mockGLTFScene }

      // Create a test transformation matrix
      const matrix = new THREE.Matrix4()
      const euler = new THREE.Euler(0.5, 0.3, 0.2)
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(euler)
      const position = new THREE.Vector3(0, 0, 0)
      const scale = new THREE.Vector3(1, 1, 1)
      matrix.compose(position, quaternion, scale)

      // Apply matrix
      avatar.applyMatrix(matrix, { scale: 1 })

      // Spine2 should get 10% of rotation
      // QuickRig: rotation.set(y/10, z/10, x/10)
      expect(mockSpine2Bone.rotation.x).toBeCloseTo(-0.3/10, 1) // yaw (mirrored)
      expect(mockSpine2Bone.rotation.y).toBeCloseTo(-0.2/10, 1) // roll (mirrored)
      expect(mockSpine2Bone.rotation.z).toBeCloseTo(0.5/10, 1) // pitch
    })
  })

  describe('Edge Cases', () => {
    test('handles zero rotation values', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'standard',
        fullBodyAvatar: true
      })

      const mockHeadBone = new THREE.Bone()
      ;(avatar as any).headBone = mockHeadBone

      const matrix = new THREE.Matrix4()
      const euler = new THREE.Euler(0, 0, 0)
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(euler)
      const position = new THREE.Vector3(0, 0, 0)
      const scale = new THREE.Vector3(1, 1, 1)
      matrix.compose(position, quaternion, scale)

      avatar.applyMatrix(matrix, { scale: 1 })

      expect(mockHeadBone.rotation.x).toBeCloseTo(0, 5)
      expect(mockHeadBone.rotation.y).toBeCloseTo(0, 5)
      expect(mockHeadBone.rotation.z).toBeCloseTo(0, 5)
    })

    test('handles large rotation values', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'quickrig',
        fullBodyAvatar: true
      })

      const mockHeadBone = new THREE.Bone()
      ;(avatar as any).headBone = mockHeadBone

      const matrix = new THREE.Matrix4()
      const euler = new THREE.Euler(Math.PI, Math.PI / 2, Math.PI / 4)
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(euler)
      const position = new THREE.Vector3(0, 0, 0)
      const scale = new THREE.Vector3(1, 1, 1)
      matrix.compose(position, quaternion, scale)

      // Should not throw
      expect(() => avatar.applyMatrix(matrix, { scale: 1 })).not.toThrow()
    })

    test('works without neck bone', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'standard',
        fullBodyAvatar: true
      })

      const mockHeadBone = new THREE.Bone()
      ;(avatar as any).headBone = mockHeadBone
      ;(avatar as any).neckBone = null

      const matrix = new THREE.Matrix4()

      // Should not throw
      expect(() => avatar.applyMatrix(matrix, { scale: 1 })).not.toThrow()
    })

    test('works without spine2 bone', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'quickrig',
        fullBodyAvatar: true
      })

      const mockHeadBone = new THREE.Bone()
      ;(avatar as any).headBone = mockHeadBone
      ;(avatar as any).spine2Bone = null

      const matrix = new THREE.Matrix4()

      // Should not throw
      expect(() => avatar.applyMatrix(matrix, { scale: 1 })).not.toThrow()
    })
  })

  describe('Cleanup', () => {
    test('destroy method cleans up avatar state', () => {
      const avatar = new Avatar('/test-model.glb', scene, {
        axisMapping: 'quickrig'
      })
      
      avatar.destroy()
      
      expect(avatar.loaded).toBe(false)
    })
  })
})
