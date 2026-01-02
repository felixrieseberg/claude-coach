<script lang="ts">
  import {
    type Settings,
    type Theme,
    recalculateHrZones,
    recalculatePowerZones,
    recalculateRunPaceZones,
    recalculateSwimPaceZones,
  } from "../stores/settings.js";

  interface Props {
    settings: Settings;
    onClose: () => void;
    onChange: (settings: Settings) => void;
  }

  let { settings, onClose, onChange }: Props = $props();

  let activeTab = $state("general");
  let localSettings = $state(JSON.parse(JSON.stringify(settings)));

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("modal-overlay")) {
      onClose();
    }
  }

  function save() {
    onChange(localSettings);
  }

  function setTheme(theme: Theme) {
    localSettings.theme = theme;
    save();
  }

  function recalcHr(sport: "run" | "bike") {
    localSettings[sport].hrZones = recalculateHrZones(localSettings[sport].lthr);
    save();
  }

  function recalcPower() {
    localSettings.bike.powerZones = recalculatePowerZones(localSettings.bike.ftp);
    save();
  }

  function recalcRunPace() {
    localSettings.run.paceZones = recalculateRunPaceZones(localSettings.run.thresholdPace);
    save();
  }

  function recalcSwimPace() {
    localSettings.swim.paceZones = recalculateSwimPaceZones(localSettings.swim.css);
    save();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="modal-overlay active" onclick={handleBackdropClick} role="dialog" aria-modal="true">
  <div class="modal settings-modal">
    <div class="modal-fixed-header">
      <div class="modal-header">
        <h2 class="modal-title">Settings</h2>
        <button class="modal-close" onclick={onClose}>×</button>
      </div>

      <div class="settings-tabs">
        {#each [["general", "General"], ["run", "Run"], ["bike", "Bike"], ["swim", "Swim"]] as [id, label]}
          <button
            class="settings-tab"
            class:active={activeTab === id}
            onclick={() => (activeTab = id)}
          >
            {label}
          </button>
        {/each}
      </div>
    </div>

    <div class="modal-body">
      <!-- General Tab -->
      {#if activeTab === "general"}
        <div class="settings-section">
          <h4 class="settings-section-title">Appearance</h4>
          <div class="theme-toggle">
            <button
              class="theme-btn"
              class:active={localSettings.theme === "light"}
              onclick={() => setTheme("light")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5" />
                <path
                  d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                />
              </svg>
              Light
            </button>
            <button
              class="theme-btn"
              class:active={localSettings.theme === "dark"}
              onclick={() => setTheme("dark")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              Dark
            </button>
          </div>
        </div>

        <div class="settings-section">
          <h4 class="settings-section-title">Distance Units</h4>
          <div class="settings-row">
            <span class="settings-label">Swim</span>
            <select class="settings-select" bind:value={localSettings.units.swim} onchange={save}>
              <option value="meters">Meters</option>
              <option value="yards">Yards</option>
            </select>
          </div>
          <div class="settings-row">
            <span class="settings-label">Bike</span>
            <select class="settings-select" bind:value={localSettings.units.bike} onchange={save}>
              <option value="kilometers">Kilometers</option>
              <option value="miles">Miles</option>
            </select>
          </div>
          <div class="settings-row">
            <span class="settings-label">Run</span>
            <select class="settings-select" bind:value={localSettings.units.run} onchange={save}>
              <option value="kilometers">Kilometers</option>
              <option value="miles">Miles</option>
            </select>
          </div>
        </div>

        <div class="settings-section">
          <h4 class="settings-section-title">Calendar</h4>
          <div class="settings-row">
            <span class="settings-label">First day of week</span>
            <select
              class="settings-select"
              bind:value={localSettings.firstDayOfWeek}
              onchange={save}
            >
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>
        </div>
      {/if}

      <!-- Run Tab -->
      {#if activeTab === "run"}
        <div class="settings-section">
          <h4 class="settings-section-title">Heart Rate Zones</h4>
          <div class="threshold-row">
            <span class="threshold-label">Run LTHR</span>
            <input
              type="number"
              class="threshold-input"
              bind:value={localSettings.run.lthr}
              min="100"
              max="220"
            />
            <button class="recalc-btn" onclick={() => recalcHr("run")}>Recalculate</button>
          </div>
          <div class="zones-grid">
            <div class="zone-row header">
              <span>Zone</span><span>Name</span><span>Low</span><span>High</span>
            </div>
            {#each localSettings.run.hrZones as zone, i}
              <div class="zone-row">
                <span class="zone-badge z{zone.zone}">Z{zone.zone}</span>
                <span class="zone-name">{zone.name}</span>
                <input
                  type="number"
                  class="zone-input"
                  bind:value={localSettings.run.hrZones[i].low}
                  onchange={save}
                />
                <input
                  type="number"
                  class="zone-input"
                  bind:value={localSettings.run.hrZones[i].high}
                  onchange={save}
                />
              </div>
            {/each}
          </div>
          <details class="help-details">
            <summary>How to find your LTHR</summary>
            <div class="help-content">
              <p><strong>30-Minute Test:</strong></p>
              <ol>
                <li>Warm up for 15 minutes</li>
                <li>Run as hard as you can sustain for 30 minutes</li>
                <li>Your average HR for the last 20 minutes is your LTHR</li>
              </ol>
            </div>
          </details>
        </div>

        <div class="settings-section">
          <h4 class="settings-section-title">Pace Zones</h4>
          <div class="threshold-row">
            <span class="threshold-label">Threshold Pace</span>
            <input
              type="text"
              class="threshold-input"
              bind:value={localSettings.run.thresholdPace}
              placeholder="4:30"
            />
            <button class="recalc-btn" onclick={recalcRunPace}>Recalculate</button>
          </div>
          <div class="zones-grid">
            <div class="zone-row header">
              <span>Zone</span><span>Name</span><span colspan="2">Pace/km</span>
            </div>
            {#each localSettings.run.paceZones as zone, i}
              <div class="zone-row">
                <span class="zone-badge z{i + 1}">{zone.zone}</span>
                <span class="zone-name">{zone.name}</span>
                <input
                  type="text"
                  class="pace-input"
                  bind:value={localSettings.run.paceZones[i].pace}
                  onchange={save}
                />
              </div>
            {/each}
          </div>
          <details class="help-details">
            <summary>How to find your Threshold Pace</summary>
            <div class="help-content">
              <p><strong>Option 1: Race-Based</strong></p>
              <ul>
                <li>Recent 5K race pace + 15-20 sec/km</li>
                <li>Recent 10K race pace + 5-10 sec/km</li>
              </ul>
              <p><strong>Option 2: 30-Minute Test</strong></p>
              <p>Run 30 minutes at max sustainable effort. Average pace = threshold.</p>
            </div>
          </details>
        </div>
      {/if}

      <!-- Bike Tab -->
      {#if activeTab === "bike"}
        <div class="settings-section">
          <h4 class="settings-section-title">Heart Rate Zones</h4>
          <div class="threshold-row">
            <span class="threshold-label">Bike LTHR</span>
            <input
              type="number"
              class="threshold-input"
              bind:value={localSettings.bike.lthr}
              min="100"
              max="220"
            />
            <button class="recalc-btn" onclick={() => recalcHr("bike")}>Recalculate</button>
          </div>
          <div class="zones-grid">
            <div class="zone-row header">
              <span>Zone</span><span>Name</span><span>Low</span><span>High</span>
            </div>
            {#each localSettings.bike.hrZones as zone, i}
              <div class="zone-row">
                <span class="zone-badge z{zone.zone}">Z{zone.zone}</span>
                <span class="zone-name">{zone.name}</span>
                <input
                  type="number"
                  class="zone-input"
                  bind:value={localSettings.bike.hrZones[i].low}
                  onchange={save}
                />
                <input
                  type="number"
                  class="zone-input"
                  bind:value={localSettings.bike.hrZones[i].high}
                  onchange={save}
                />
              </div>
            {/each}
          </div>
          <details class="help-details">
            <summary>How to find your LTHR</summary>
            <div class="help-content">
              <p><strong>30-Minute Test:</strong></p>
              <ol>
                <li>Warm up for 15 minutes</li>
                <li>Bike as hard as you can sustain for 30 minutes</li>
                <li>Your average HR for the last 20 minutes is your LTHR</li>
              </ol>
              <p class="help-note">Bike LTHR is typically 5-10 bpm lower than run.</p>
            </div>
          </details>
        </div>

        <div class="settings-section">
          <h4 class="settings-section-title">Power Zones</h4>
          <div class="threshold-row">
            <span class="threshold-label">FTP (watts)</span>
            <input
              type="number"
              class="threshold-input"
              bind:value={localSettings.bike.ftp}
              min="50"
              max="500"
            />
            <button class="recalc-btn" onclick={recalcPower}>Recalculate</button>
          </div>
          <div class="zones-grid">
            <div class="zone-row header">
              <span>Zone</span><span>Name</span><span>Low W</span><span>High W</span>
            </div>
            {#each localSettings.bike.powerZones as zone, i}
              <div class="zone-row">
                <span class="zone-badge z{zone.zone}">Z{zone.zone}</span>
                <span class="zone-name">{zone.name}</span>
                <input
                  type="number"
                  class="zone-input"
                  bind:value={localSettings.bike.powerZones[i].low}
                  onchange={save}
                />
                <input
                  type="number"
                  class="zone-input"
                  bind:value={localSettings.bike.powerZones[i].high}
                  onchange={save}
                />
              </div>
            {/each}
          </div>
          <details class="help-details">
            <summary>How to find your FTP</summary>
            <div class="help-content">
              <p><strong>20-Minute Test:</strong></p>
              <ol>
                <li>Warm up for 20 minutes including a few hard efforts</li>
                <li>Ride as hard as you can sustain for 20 minutes</li>
                <li>FTP = Average power × 0.95</li>
              </ol>
              <p>
                <strong>Ramp Test:</strong> Most trainer apps (Zwift, TrainerRoad) have built-in FTP tests.
              </p>
            </div>
          </details>
        </div>
      {/if}

      <!-- Swim Tab -->
      {#if activeTab === "swim"}
        <div class="settings-section">
          <h4 class="settings-section-title">Pace Zones</h4>
          <div class="threshold-row">
            <span class="threshold-label">CSS (per 100m)</span>
            <input
              type="text"
              class="threshold-input"
              bind:value={localSettings.swim.css}
              placeholder="1:45"
            />
            <button class="recalc-btn" onclick={recalcSwimPace}>Recalculate</button>
          </div>
          <div class="zones-grid">
            <div class="zone-row header">
              <span>Zone</span><span>Name</span><span>Offset</span><span>Pace/100</span>
            </div>
            {#each localSettings.swim.paceZones as zone, i}
              <div class="zone-row">
                <span class="zone-badge z{zone.zone}">Z{zone.zone}</span>
                <span class="zone-name">{zone.name}</span>
                <span class="zone-name">{(zone.offset ?? 0) >= 0 ? "+" : ""}{zone.offset}s</span>
                <input
                  type="text"
                  class="pace-input"
                  bind:value={localSettings.swim.paceZones[i].pace}
                  onchange={save}
                />
              </div>
            {/each}
          </div>
          <details class="help-details">
            <summary>How to find your CSS</summary>
            <div class="help-content">
              <p><strong>CSS Test (Critical Swim Speed):</strong></p>
              <ol>
                <li>Warm up for 10 minutes</li>
                <li>Swim 400m all-out, record time (T400)</li>
                <li>Rest 5-10 minutes</li>
                <li>Swim 200m all-out, record time (T200)</li>
                <li>CSS = (T400 - T200) ÷ 2 = pace per 100m</li>
              </ol>
              <p>
                <strong>Example:</strong> 400m in 6:40 (400s), 200m in 3:00 (180s)<br />
                CSS = (400 - 180) ÷ 2 = 110 sec/100m = 1:50/100m
              </p>
            </div>
          </details>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    opacity: 0;
    visibility: hidden;
    transition: all var(--transition-normal);
  }

  .modal-overlay.active {
    opacity: 1;
    visibility: visible;
  }

  .settings-modal {
    background: var(--bg-secondary);
    border-radius: 20px;
    max-width: 640px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    border: 1px solid var(--border-medium);
    display: flex;
    flex-direction: column;
  }

  .modal-fixed-header {
    flex-shrink: 0;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-subtle);
  }

  .modal-header {
    padding: 1.5rem 2rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-title {
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .modal-close {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--border-medium);
    background: transparent;
    color: var(--text-muted);
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }

  .modal-close:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .settings-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0 2rem 1rem;
  }

  .settings-tab {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 500;
    border: none;
    background: transparent;
    color: var(--text-muted);
    border-radius: 8px;
    transition: all var(--transition-fast);
  }

  .settings-tab:hover {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .settings-tab.active {
    background: var(--accent);
    color: var(--bg-primary);
  }

  .modal-body {
    padding: 1.5rem 2rem 2rem;
    overflow-y: auto;
    flex: 1;
  }

  .settings-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-subtle);
  }

  .settings-section:last-of-type {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .settings-section-title {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }

  /* Theme toggle */
  .theme-toggle {
    display: flex;
    gap: 0.5rem;
  }

  .theme-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    border: 1px solid var(--border-medium);
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 500;
    transition: all var(--transition-fast);
  }

  .theme-btn svg {
    width: 18px;
    height: 18px;
  }

  .theme-btn:hover {
    border-color: var(--text-muted);
    color: var(--text-primary);
  }

  .theme-btn.active {
    background: var(--accent);
    color: var(--bg-primary);
    border-color: var(--accent);
  }

  .settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0;
  }

  .settings-label {
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .settings-select {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-medium);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    color: var(--text-primary);
    font-size: 0.85rem;
    min-width: 140px;
  }

  .settings-select:focus {
    border-color: var(--accent);
  }

  .threshold-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--bg-tertiary);
    border-radius: 8px;
  }

  .threshold-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .threshold-input {
    background: var(--bg-primary);
    border: 1px solid var(--border-medium);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    color: var(--text-primary);
    font-family: "JetBrains Mono", monospace;
    font-size: 0.9rem;
    width: 80px;
    text-align: center;
  }

  .recalc-btn {
    padding: 0.5rem 1rem;
    background: var(--accent);
    color: var(--bg-primary);
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    transition: all var(--transition-fast);
  }

  .recalc-btn:hover {
    background: #fbbf24;
  }

  .zones-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .zone-row {
    display: grid;
    grid-template-columns: 60px 1fr 80px 80px;
    gap: 0.75rem;
    align-items: center;
  }

  .zone-row.header {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    padding-bottom: 0.25rem;
  }

  .zone-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.3rem 0.5rem;
    border-radius: 6px;
    text-align: center;
  }

  .zone-badge.z1 {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }
  .zone-badge.z2 {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
  }
  .zone-badge.z3 {
    background: rgba(234, 179, 8, 0.2);
    color: #eab308;
  }
  .zone-badge.z4 {
    background: rgba(249, 115, 22, 0.2);
    color: #f97316;
  }
  .zone-badge.z5 {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .zone-name {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .zone-input,
  .pace-input {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-medium);
    border-radius: 6px;
    padding: 0.4rem 0.5rem;
    color: var(--text-primary);
    font-family: "JetBrains Mono", monospace;
    font-size: 0.8rem;
    text-align: center;
    width: 100%;
  }

  .zone-input:focus,
  .pace-input:focus {
    border-color: var(--accent);
  }

  /* Help details */
  .help-details {
    margin-top: 1rem;
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    overflow: hidden;
  }

  .help-details summary {
    padding: 0.75rem 1rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    background: var(--bg-tertiary);
    transition: all var(--transition-fast);
  }

  .help-details summary:hover {
    color: var(--text-secondary);
  }

  .help-details[open] summary {
    border-bottom: 1px solid var(--border-subtle);
  }

  .help-content {
    padding: 1rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .help-content ol,
  .help-content ul {
    margin: 0.5rem 0 0.5rem 1.5rem;
  }

  .help-content li {
    margin-bottom: 0.25rem;
  }

  .help-content p {
    margin-bottom: 0.5rem;
  }

  .help-content p:last-child {
    margin-bottom: 0;
  }

  .help-note {
    font-style: italic;
    color: var(--text-muted);
  }
</style>
