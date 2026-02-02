# Ruvector Integration Research

Investigation into leveraging [ruvector](https://github.com/ruvnet/ruvector) for Apple Health data integration with Claude Coach.

## Executive Summary

Ruvector is a self-learning distributed vector database built in Rust with WebAssembly support. Its [iOS WASM examples](https://github.com/ruvnet/ruvector/tree/main/examples/wasm/ios) demonstrate privacy-preserving on-device AI patterns that could enhance Claude Coach. However, **direct Safari browser access to Apple HealthKit is not possible** - a native iOS app component would be required to bridge health data to the web application.

## Ruvector Overview

### What Is Ruvector?

Ruvector is an open-source vector database that distinguishes itself through autonomous improvement capabilities. Key features:

- **Self-Learning**: Q-learning from query feedback, neural pattern recognition
- **High Performance**: ~61µs search latency, HNSW indexing
- **Multi-Platform**: Node.js, Browser (WASM), Edge (rvLite), PostgreSQL extension
- **Privacy-First**: On-device processing, no data transmission required

### iOS WASM Capabilities

The [iOS WASM module](https://github.com/ruvnet/ruvector/tree/main/examples/wasm/ios) provides:

| Feature         | Specification                         |
| --------------- | ------------------------------------- |
| Binary Size     | ~103 KB (native), ~357 KB (browser)   |
| Search Latency  | 2.1ms for 100K vectors                |
| Browser Support | Safari 16.4+, Chrome 91+, Firefox 89+ |
| Quantization    | Scalar (4x), Binary (32x) compression |

## Health Data Examples Analysis

### Privacy-Preserving Health Insights

The [health learner module](https://github.com/ruvnet/ruvector/tree/main/examples/wasm/ios#2-privacy-preserving-health-insights) uses a bucket normalization approach:

```javascript
health.learn_event({
  metric: HealthMetrics.STEPS,
  value_bucket: 7, // Normalized 0-9 scale
  hour: 8,
  day_of_week: 1,
});
```

**What Gets Learned:**

- Activity patterns and timing
- Sleep schedule patterns
- Behavioral trends by day/hour

**What Is Never Stored:**

- Actual health metric values
- Raw biometric data
- Medical information

### Digital Wellbeing Dashboard

The [wellbeing dashboard](https://github.com/ruvnet/ruvector/tree/main/examples/wasm/ios#4-digital-wellbeing-dashboard) integrates multiple privacy-preserving learners:

- Health activity monitoring
- Location patterns (venue categories, not GPS)
- Calendar availability
- Communication response patterns
- App usage by category

## Critical Limitation: HealthKit Web Access

### The Problem

**Apple HealthKit cannot be accessed directly from Safari or any web browser.** This is by design for privacy and security.

From [Apple Developer Documentation](https://developer.apple.com/documentation/healthkit):

> HealthKit is a native iOS/iPadOS framework requiring app-store-distributed applications.

Key constraints:

- No REST API or JavaScript API exists for HealthKit
- All health data stays on-device
- Explicit user authorization required via native UI
- No backend API for remote data access

### Implications for Claude Coach

The ruvector iOS WASM examples assume health data is **already available** to the application. In a pure Safari PWA context, there is no way to obtain this data without a native iOS component.

## Integration Architecture Options

### Option 1: Safari Web Extension + Native App

```
┌─────────────────────────────────────────────────────────┐
│                    iPhone                                │
│  ┌─────────────────┐     ┌─────────────────────────┐   │
│  │  Native iOS App │────▶│    Apple HealthKit      │   │
│  │  (Swift/SwiftUI)│◀────│    (Health Data Store)  │   │
│  └────────┬────────┘     └─────────────────────────┘   │
│           │ Message Passing                              │
│           ▼                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Safari Web Extension                    │   │
│  │  ┌─────────────┐    ┌──────────────────────┐   │   │
│  │  │  Ruvector   │    │  Claude Coach        │   │   │
│  │  │  WASM Core  │◀──▶│  Plan Viewer         │   │   │
│  │  └─────────────┘    └──────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Pros:**

- Full HealthKit access via native component
- Privacy-preserving with ruvector's bucket normalization
- Works offline with on-device processing

**Cons:**

- Requires App Store distribution
- More complex development (Swift + Web)
- User must install both app and extension

### Option 2: Companion iOS App with Cloud Sync

```
┌──────────────────┐         ┌──────────────────┐
│   iPhone App     │         │   Safari/Web     │
│  ┌────────────┐  │         │  ┌────────────┐  │
│  │ HealthKit  │  │  Sync   │  │  Claude    │  │
│  │ Reader     │──┼────────▶│  │  Coach     │  │
│  └────────────┘  │         │  │  Viewer    │  │
│  ┌────────────┐  │         │  └────────────┘  │
│  │ Ruvector   │  │         │  ┌────────────┐  │
│  │ Privacy    │  │         │  │  Ruvector  │  │
│  │ Normalizer │  │         │  │  WASM      │  │
│  └────────────┘  │         │  └────────────┘  │
└──────────────────┘         └──────────────────┘
```

**Pros:**

- Cleaner separation of concerns
- Existing Strava sync pattern in Claude Coach
- Web viewer remains pure browser app

**Cons:**

- Data leaves device (privacy concern)
- Requires backend infrastructure
- Network dependency

### Option 3: PWA with Manual Data Entry

```
┌─────────────────────────────────────────┐
│         Safari PWA                       │
│  ┌─────────────────────────────────┐   │
│  │       Claude Coach Viewer        │   │
│  │  ┌───────────┐  ┌─────────────┐ │   │
│  │  │ Manual    │  │  Ruvector   │ │   │
│  │  │ Health    │──│  Pattern    │ │   │
│  │  │ Input     │  │  Learning   │ │   │
│  │  └───────────┘  └─────────────┘ │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Pros:**

- No native app required
- Simple implementation
- Works today

**Cons:**

- Manual data entry burden
- No automatic HealthKit sync
- User compliance issues

## Ruvector Value Propositions for Claude Coach

Even without direct HealthKit access, ruvector offers value:

### 1. On-Device Training Pattern Analysis

Use ruvector's self-learning capabilities to:

- Identify optimal training times based on historical patterns
- Predict recovery needs from workout completion patterns
- Personalize plan adjustments without cloud dependency

### 2. Privacy-Preserving Athlete Profiling

Apply bucket normalization to training data:

```typescript
interface NormalizedTrainingEvent {
  activityType: Sport;
  intensityBucket: 0-9;      // Normalized RPE/HR zone
  durationBucket: 0-9;       // Normalized duration
  elevationBucket: 0-9;      // Normalized vert
  hourOfDay: number;
  dayOfWeek: number;
}
```

### 3. Offline Workout Recommendations

Use ruvector's vector search for:

- Similar workout matching from plan library
- Alternative workout suggestions based on constraints
- Trail route recommendations based on terrain similarity

### 4. Semantic Search in Training Plans

Enable natural language queries:

- "Find threshold runs with 500m+ elevation"
- "Show recovery workouts after long trail runs"
- "Similar workouts to last week's uphill repeats"

## Integration with Existing Claude Coach Architecture

### Current Architecture

```
src/
├── viewer/           # Svelte SPA (can embed ruvector WASM)
│   ├── stores/       # Could use ruvector for pattern storage
│   └── lib/          # Add ruvector utilities here
├── schema/           # Training plan types (compatible with ruvector)
└── db/               # SQLite (could sync with ruvector)
```

### Proposed Additions

```
src/
├── ruvector/                    # NEW: Ruvector integration
│   ├── wasm/                    # WASM binaries
│   ├── learners/                # Training pattern learners
│   │   ├── workout-patterns.ts  # Learn workout timing preferences
│   │   ├── recovery-signals.ts  # Learn recovery patterns
│   │   └── terrain-prefs.ts     # Learn terrain preferences
│   └── search/                  # Vector search utilities
│       ├── workout-similarity.ts
│       └── plan-search.ts
└── viewer/
    └── lib/
        └── ruvector-bridge.ts   # WASM loader and API wrapper
```

## Technical Compatibility Assessment

### Compatible Aspects

| Claude Coach | Ruvector      | Compatibility           |
| ------------ | ------------- | ----------------------- |
| TypeScript   | Rust/WASM     | ✅ via wasm-bindgen     |
| Svelte 5     | Browser WASM  | ✅ Full support         |
| ES Modules   | WASM ESM      | ✅ Native support       |
| localStorage | IndexedDB     | ✅ Both supported       |
| Vite build   | WASM bundling | ✅ Via vite-plugin-wasm |

### Integration Requirements

1. **WASM Bundling**: Add `vite-plugin-wasm` to `vite.config.viewer.ts`
2. **Type Definitions**: Create TypeScript bindings for ruvector API
3. **Async Loading**: Handle WASM async initialization in Svelte lifecycle
4. **Storage Strategy**: Decide IndexedDB vs localStorage for vector data

## Recommended Next Steps

### Phase 1: Browser-Only Integration (No HealthKit)

1. Add ruvector WASM to viewer build
2. Implement workout similarity search
3. Add training pattern learning from completed workouts
4. Enable semantic plan search

### Phase 2: Companion App Exploration

1. Research Swift/SwiftUI HealthKit integration
2. Design privacy-preserving sync protocol
3. Prototype Safari Web Extension messaging
4. Evaluate App Store requirements

### Phase 3: Full Health Integration

1. Build native iOS companion app
2. Implement ruvector bucket normalization for health data
3. Create bidirectional sync with web viewer
4. Add health-aware training recommendations

## Conclusion

Ruvector offers compelling capabilities for Claude Coach, particularly for:

- On-device pattern learning and personalization
- Privacy-preserving data processing
- Fast vector search for workout similarity

However, the **primary limitation is HealthKit access** - this requires native iOS development regardless of ruvector's capabilities. The recommended approach is:

1. **Short-term**: Integrate ruvector WASM into the existing viewer for pattern learning and search using Strava-synced data
2. **Long-term**: Develop a companion iOS app that bridges HealthKit to the web viewer via ruvector's privacy-preserving patterns

## References

- [Ruvector GitHub Repository](https://github.com/ruvnet/ruvector)
- [Ruvector iOS WASM Examples](https://github.com/ruvnet/ruvector/tree/main/examples/wasm/ios)
- [Apple HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [Safari Web Extensions Messaging](https://developer.apple.com/documentation/safariservices/safari_web_extensions/messaging_between_the_app_and_javascript_in_a_safari_web_extension)
- [Apple Developer Forums - Web Apps and HealthKit](https://developer.apple.com/forums/thread/668521)
