# Structured Workouts (`structure` field)

Every workout in the plan has `humanReadable` text for people. Bike and run workouts also need a machine-readable `structure` so the plan viewer can export them to Zwift (`.zwo`), Garmin (`.fit`) and TrainerRoad/ERG (`.mrc`) with the real intervals. If `structure` is missing, every export falls back to "warmup, one steady block, cooldown", no matter what `humanReadable` says.

**Rule:** every `bike` and `run` workout (including walk/run, recovery and long sessions) gets a `structure`. Swim and brick workouts may have one. `rest` and `strength` workouts don't.

---

## Shape

```json
"structure": {
  "warmup":   [ Step, ... ],
  "main":     [ Step | IntervalSet, ... ],
  "cooldown": [ Step, ... ]
}
```

`main` is required; `warmup` and `cooldown` are optional but almost every session has them.

**Step**

```json
{
  "type": "warmup" | "work" | "recovery" | "cooldown",
  "name": "Easy jog",
  "duration": { "unit": "minutes" | "seconds", "value": 10 },
  "intensity": {
    "unit": "percent_ftp" | "percent_lthr",
    "value": 65,
    "valueLow": 60,
    "valueHigh": 70,
    "description": "Zone 2"
  },
  "cadence": { "low": 85, "high": 95 },
  "notes": "Optional coaching cue"
}
```

- `type`: use `warmup` for steps in `warmup`, `cooldown` for steps in `cooldown`, and `work` or `recovery` for steps in `main`.
- `duration`: time-based, in `minutes` or `seconds`. (Distance units exist in the schema but only Garmin understands them; Zwift and ERG need time.)
- `intensity.unit`: `percent_ftp` for bike, `percent_lthr` for run. `value` is always the percent of threshold as a plain number (`85` means 85%), never a zone number, because the exporters scale it directly: Zwift uses `value / 100` as the fraction of FTP (bike) or of threshold pace (run), TrainerRoad uses it as % FTP, and Garmin turns it into a % FTP power target (bike) or a heart-rate range in bpm from the athlete's LTHR (run). Put the human label ("Zone 2", "T pace", "walk") in `description`.
- `valueLow`/`valueHigh` are optional. On a `work` step they give a target range around `value`. On a `warmup` step they make a ramp up from `valueLow` to `valueHigh`; on a `cooldown` step a ramp down from `valueHigh` to `valueLow`.
- `cadence` and `notes` are optional.

**IntervalSet** (anything written as "N x (...)")

```json
{
  "type": "interval_set",
  "name": "Cruise intervals",
  "repeats": 4,
  "steps": [
    { "type": "work",     "name": "...", "duration": { ... }, "intensity": { ... } },
    { "type": "recovery", "name": "...", "duration": { ... }, "intensity": { ... } }
  ]
}
```

`repeats` is the number of times the `steps` list is performed. Keep `steps` to one `work` step followed by one `recovery` step: that is the shape Zwift's repeat block understands. For a pattern that doesn't fit (e.g. over-unders alternating 95% and 105% with no rest), write the alternating blocks as single `work` steps in `main` and put only the true work/recovery pairs in interval sets. Do not unroll ordinary repeats into separate steps and do not merge them into one long step.

**Consistency checks before writing the plan:**

1. Step durations (with repeats multiplied out) add up to the workout's `durationMinutes`.
2. `humanReadable` describes the same session as `structure`.
3. Intensities match the athlete's zones (see `zones.md`). As a percent of threshold:

   | Effort                   | Bike (`percent_ftp`) | Run (`percent_lthr`) |
   | ------------------------ | -------------------- | -------------------- |
   | Walk                     | —                    | 50-65                |
   | Recovery / easy          | 50-65                | 70-80                |
   | Aerobic / endurance (Z2) | 65-75                | 80-89                |
   | Tempo / marathon pace    | 76-90                | 90-94                |
   | Threshold                | 95-105               | 95-100               |
   | VO2max / interval pace   | 106-120              | 102-110              |
   | Strides, reps, sprints   | 120-150              | 110-120              |

   For run steps faster than threshold, use values above 100 so Zwift paces them faster than threshold; heart rate lags on short reps, so the `description` ("I pace", "strides") matters more there.

---

## Worked example: beginner walk/run (run)

Human-readable text:

```
WARM-UP: 5 min easy walk

MAIN SET:
4x (2 min run / 2 min walk)
Keep run pace conversational

COOL-DOWN: 4 min easy walk
```

Structure (25 minutes total: 5 + 4 × (2 + 2) + 4):

```json
{
  "id": "w1-wed",
  "sport": "run",
  "type": "endurance",
  "name": "Walk/Run Intervals",
  "description": "Aerobic development",
  "durationMinutes": 25,
  "primaryZone": "Zone 1-2",
  "structure": {
    "warmup": [
      {
        "type": "warmup",
        "name": "Easy walk",
        "duration": { "unit": "minutes", "value": 5 },
        "intensity": {
          "unit": "percent_lthr",
          "value": 60,
          "valueLow": 50,
          "valueHigh": 60,
          "description": "Walk"
        }
      }
    ],
    "main": [
      {
        "type": "interval_set",
        "name": "Run/walk",
        "repeats": 4,
        "steps": [
          {
            "type": "work",
            "name": "Run",
            "duration": { "unit": "minutes", "value": 2 },
            "intensity": {
              "unit": "percent_lthr",
              "value": 85,
              "description": "Zone 2, conversational"
            }
          },
          {
            "type": "recovery",
            "name": "Walk",
            "duration": { "unit": "minutes", "value": 2 },
            "intensity": { "unit": "percent_lthr", "value": 60, "description": "Walk" }
          }
        ]
      }
    ],
    "cooldown": [
      {
        "type": "cooldown",
        "name": "Easy walk",
        "duration": { "unit": "minutes", "value": 4 },
        "intensity": {
          "unit": "percent_lthr",
          "value": 60,
          "valueLow": 50,
          "valueHigh": 60,
          "description": "Walk"
        }
      }
    ]
  },
  "humanReadable": "WARM-UP: 5 min easy walk\n\nMAIN SET:\n4x (2 min run / 2 min walk)\nKeep run pace conversational\n\nCOOL-DOWN: 4 min easy walk",
  "completed": false
}
```

This exports to Zwift as a 5-minute warmup, `4x` 2 min on / 2 min off, and a 4-minute cooldown, instead of one 15-minute block.

---

## Worked example: bike VO2max session

Human-readable text:

```
Warm-up: 20min progressive to Zone 3
Main: 5 x 5min @ 110-115% FTP, 5min @ 50% FTP recovery
Cool-down: 15min easy spin
```

Structure (85 minutes):

```json
"structure": {
  "warmup": [
    {
      "type": "warmup",
      "name": "Progressive warm-up",
      "duration": { "unit": "minutes", "value": 20 },
      "intensity": { "unit": "percent_ftp", "value": 80, "valueLow": 50, "valueHigh": 80, "description": "Build to Zone 3" }
    }
  ],
  "main": [
    {
      "type": "interval_set",
      "name": "VO2max",
      "repeats": 5,
      "steps": [
        {
          "type": "work",
          "name": "VO2max",
          "duration": { "unit": "minutes", "value": 5 },
          "intensity": { "unit": "percent_ftp", "value": 112, "valueLow": 110, "valueHigh": 115, "description": "Zone 5" },
          "cadence": { "low": 95, "high": 105 }
        },
        {
          "type": "recovery",
          "name": "Easy spin",
          "duration": { "unit": "minutes", "value": 5 },
          "intensity": { "unit": "percent_ftp", "value": 50, "description": "Zone 1" }
        }
      ]
    }
  ],
  "cooldown": [
    {
      "type": "cooldown",
      "name": "Easy spin",
      "duration": { "unit": "minutes", "value": 15 },
      "intensity": { "unit": "percent_ftp", "value": 55, "valueLow": 40, "valueHigh": 55, "description": "Zone 1" }
    }
  ]
}
```

---

## Steady sessions still get a structure

An easy 45-minute run with no intervals is three steps, not zero:

```json
"structure": {
  "warmup":   [{ "type": "warmup",   "name": "Easy jog", "duration": { "unit": "minutes", "value": 10 }, "intensity": { "unit": "percent_lthr", "value": 80, "valueLow": 70, "valueHigh": 80, "description": "Zone 1-2" } }],
  "main":     [{ "type": "work",     "name": "Aerobic",  "duration": { "unit": "minutes", "value": 30 }, "intensity": { "unit": "percent_lthr", "value": 85, "description": "Zone 2" } }],
  "cooldown": [{ "type": "cooldown", "name": "Easy jog", "duration": { "unit": "minutes", "value": 5 },  "intensity": { "unit": "percent_lthr", "value": 75, "valueLow": 65, "valueHigh": 75, "description": "Zone 1" } }]
}
```

Strides or pickups at the end of an easy run are a second interval set in `main`, e.g. `{ "type": "interval_set", "name": "Strides", "repeats": 4, "steps": [20 s work @ 115%, 60 s recovery @ 65%] }` written out as full steps.
