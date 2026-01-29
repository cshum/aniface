# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-01-28

### Added
- Configurable axis mapping for different rigging systems in `modelOptions`
  - `axisMapping?: 'standard' | 'quickrig'` - Bone rotation axis mapping (default: `'standard'`)
  - `'standard'`: For Ready Player Me and similar models (rotation.x=pitch, rotation.y=yaw, rotation.z=roll)
  - `'quickrig'`: For QuickRig rigged models (rotation.x=yaw, rotation.y=roll, rotation.z=pitch)
- Support for QuickRig full-body avatars with correct bone rotations
- 26 new test cases for axis mapping functionality in `tests/Avatar.test.ts` and `tests/Aniface.test.ts`

### Changed
- Updated bone rotation logic to support multiple rigging conventions
- Improved rotation cascading for Head, Neck, and Spine2 bones with configurable axis mapping

### Fixed
- Full-body avatars from different rigging systems now correctly follow face movements
- QuickRig avatars no longer move in wrong directions when looking up/down or left/right

[0.4.0]: https://github.com/alysachan830/aniface/releases/tag/v0.4.0

## [0.3.0] - 2026-01-21

### Added
- Configurable camera position and target in `cameraConfig`
  - `position?: [number, number, number]` - Camera position in 3D space (default: `[0, 0, 1.5]`)
  - `target?: [number, number, number]` - Camera lookAt target (default: `[0, 0, 0]`)
- Configurable model position in `modelOptions`
  - `position?: [number, number, number]` - Model offset applied after centering (default: `[0, 0, 0]`)
- Support for local Ready Player Me avatar files
- New test cases for position configuration options

### Changed
- Removed hardcoded camera positioning logic for full-body avatars from core library
- Camera and model positioning are now fully configurable per avatar instance
- Demo now uses local RPM avatar file (`demo/public/rpm_avatar.glb`) instead of API call

### Fixed
- Improved camera framing for full-body avatars to show complete head and upper body

[0.3.0]: https://github.com/alysachan830/aniface/releases/tag/v0.3.0

## [0.2.0] - 2026-01-19

### Added
- Manual landmark input support via `processLandmarkData()` method for event-driven updates
- Export `FaceLandmarkerResult` type from main package for easier TypeScript integration
- Two input modes now supported:
  - Built-in MediaPipe detection (provide `videoElement`, call `start()`)
  - Manual updates (call `processLandmarkData()` when you have data)
- Node.js version requirement specified in `package.json` engines field (>=18.0.0)

### Changed
- `videoElement` is now optional in `AnifaceConfig` when using manual landmark input
- `FacialLandmarkManager` initialization is now skipped when no `videoElement` is provided
- Updated documentation with comprehensive examples for both input modes

[0.2.0]: https://github.com/alysachan830/aniface/releases/tag/v0.2.0


## [0.1.1] - 2025-11-25

### Fixed
- Fixed head-only avatar models (e.g., raccoon) moving in opposite direction when turning head
- Added proper Y and Z axis rotation mirroring for head-only models to match full-body avatar behavior

## [0.1.0] - 2025-11-23

**Note**: This version on npm has a bug with head-only avatars. Please use 0.1.1 or later.

### Added
- Initial release of Aniface
- Real-time facial tracking using MediaPipe Face Landmarker
- 3D avatar rendering with Three.js
- Automatic blendshape mapping for ARKit-compatible models
- High-level `Aniface` class for easy integration
- Low-level components for advanced usage:
  - `FacialLandmarkManager` for facial tracking
  - `AvatarRenderer` for 3D rendering
  - `Avatar` for model management
- Utility functions for blendshape retargeting and manipulation
- TypeScript support with full type definitions
- Customizable camera and lighting configurations
- Blendshape multipliers for fine-tuning expressions
- Comprehensive documentation and examples

### Features
- 52 ARKit blendshapes supported
- Real-time performance optimization
- Configurable detection and tracking confidence
- Support for GLB/GLTF models
- Camera controls (orbit, zoom)
- MediaPipe WASM files can be served from CDN or self-hosted

[0.1.1]: https://github.com/alysachan830/aniface/releases/tag/v0.1.1
[0.1.0]: https://github.com/alysachan830/aniface/releases/tag/v0.1.0

