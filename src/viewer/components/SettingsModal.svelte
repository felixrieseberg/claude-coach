<script lang="ts">
  import { untrack } from "svelte";
  import {
    type Settings,
    type Theme,
    recalculateHrZones,
    recalculatePowerZones,
    recalculateRunPaceZones,
    recalculateSwimPaceZones,
  } from "../stores/settings.js";
  import { version } from "../../../package.json";

  interface Props {
    settings: Settings;
    onClose: () => void;
    onChange: (settings: Settings) => void;
    onOpenImportHelp: () => void;
  }

  let { settings, onClose, onChange, onOpenImportHelp }: Props = $props();

  let activeTab = $state("general");
  // Use untrack to explicitly capture initial value (intentional local copy)
  let localSettings = $state(untrack(() => JSON.parse(JSON.stringify(settings))));

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

  // Data import/export
  let importStatus = $state<{ message: string; isError: boolean } | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);

  function exportData() {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data[key] = localStorage.getItem(key) || "";
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `training-plan-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInput?.click();
  }

  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (typeof data !== "object" || data === null) {
        throw new Error("Invalid file format");
      }

      // Clear and restore localStorage
      localStorage.clear();
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string") {
          localStorage.setItem(key, value);
        }
      }

      importStatus = { message: "Data restored! Reloading...", isError: false };
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      importStatus = {
        message: "Could not read file. Make sure it's a valid backup.",
        isError: true,
      };
      setTimeout(() => (importStatus = null), 4000);
    }

    // Reset file input
    input.value = "";
  }

  function clearAllData() {
    if (
      confirm("This will delete all your settings, completed workouts, and changes. Are you sure?")
    ) {
      localStorage.clear();
      window.location.reload();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="modal-overlay active"
  onclick={handleBackdropClick}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div class="modal settings-modal">
    <div class="modal-fixed-header">
      <div class="modal-header">
        <h2 class="modal-title">Settings</h2>
        <button class="modal-close" onclick={onClose}>×</button>
      </div>

      <div class="settings-tabs">
        {#each [["general", "General"], ["run", "Run"], ["bike", "Bike"], ["swim", "Swim"], ["data", "Data"], ["about", "About"]] as [id, label]}
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

      <!-- Data Tab -->
      {#if activeTab === "data"}
        <div class="settings-section">
          <h4 class="settings-section-title">Your Data</h4>
          <div class="data-explainer">
            <p>
              Your training data is stored <strong>only on this device</strong>, in your browser's
              local storage. This includes your settings, completed workouts, and any changes you've
              made to your plan.
            </p>
            <p>
              If you clear your browser data, switch browsers, or use a different device, your
              progress won't be there. Use the backup feature below to save your data and restore it
              later.
            </p>
          </div>
        </div>

        <div class="settings-section">
          <h4 class="settings-section-title">Import to Other Apps</h4>
          <div class="data-action">
            <div class="data-action-info">
              <span class="data-action-title">Import Help</span>
              <span class="data-action-desc"
                >Learn how to import exported workouts into Zwift, Garmin, TrainerRoad, and more.</span
              >
            </div>
            <button class="data-btn help" onclick={onOpenImportHelp}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              View Guide
            </button>
          </div>
        </div>

        <div class="settings-section">
          <h4 class="settings-section-title">Backup & Restore</h4>

          <div class="data-action">
            <div class="data-action-info">
              <span class="data-action-title">Export Backup</span>
              <span class="data-action-desc"
                >Download a file containing all your data. Keep it somewhere safe.</span
              >
            </div>
            <button class="data-btn export" onclick={exportData}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
          </div>

          <div class="data-action">
            <div class="data-action-info">
              <span class="data-action-title">Import Backup</span>
              <span class="data-action-desc"
                >Restore from a backup file. This will replace your current data.</span
              >
            </div>
            <button class="data-btn import" onclick={handleImportClick}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import
            </button>
            <input
              type="file"
              accept=".json"
              bind:this={fileInput}
              onchange={handleFileSelect}
              style="display: none"
            />
          </div>

          {#if importStatus}
            <div class="import-status" class:error={importStatus.isError}>
              {importStatus.message}
            </div>
          {/if}
        </div>

        <div class="settings-section">
          <h4 class="settings-section-title">Danger Zone</h4>
          <div class="data-action danger">
            <div class="data-action-info">
              <span class="data-action-title">Clear All Data</span>
              <span class="data-action-desc"
                >Delete everything and start fresh. This cannot be undone.</span
              >
            </div>
            <button class="data-btn danger" onclick={clearAllData}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path
                  d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
              Clear
            </button>
          </div>
        </div>
      {/if}

      <!-- About Tab -->
      {#if activeTab === "about"}
        <div class="settings-section">
          <div class="about-header">
            <h3 class="about-title">Claude Coach</h3>
            <span class="about-version">v{version}</span>
          </div>
          <p class="about-description">
            Personalized training plans for triathlons, marathons, and endurance events. Built with
            Claude.
          </p>
        </div>

        <div class="settings-section">
          <h4 class="settings-section-title">Created By</h4>
          <div class="about-author">
            <span class="author-name">Felix Rieseberg</span>
            <div class="author-links">
              <a
                href="https://felixrieseberg.com"
                target="_blank"
                rel="noopener"
                class="author-link">felixrieseberg.com</a
              >
              <span class="author-separator">·</span>
              <a href="mailto:felix@felixrieseberg.com" class="author-link"
                >felix@felixrieseberg.com</a
              >
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h4 class="settings-section-title">Links</h4>
          <div class="about-links">
            <a
              href="https://github.com/felixrieseberg/claude-coach"
              target="_blank"
              rel="noopener"
              class="about-link"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                />
              </svg>
              GitHub Repository
            </a>
          </div>
        </div>

        <div class="settings-section">
          <h4 class="settings-section-title">License</h4>
          <p class="about-license">MIT License. Free to use, modify, and distribute.</p>
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
    align-items: flex-start;
    justify-content: center;
    padding: 2rem;
    padding-top: 5vh;
    opacity: 0;
    visibility: hidden;
    transition: all var(--transition-normal);
    overflow-y: auto;
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
    max-height: calc(100vh - 10vh - 4rem);
    overflow: hidden;
    border: 1px solid var(--border-medium);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
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
    background: var(--bg-elevated);
    border-color: var(--border-medium);
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

  /* Data tab */
  .data-explainer {
    background: var(--bg-tertiary);
    border-radius: 10px;
    padding: 1rem 1.25rem;
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .data-explainer p {
    margin-bottom: 0.75rem;
  }

  .data-explainer p:last-child {
    margin-bottom: 0;
  }

  .data-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-tertiary);
    border-radius: 10px;
    margin-bottom: 0.75rem;
  }

  .data-action:last-of-type {
    margin-bottom: 0;
  }

  .data-action.danger {
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .data-action-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .data-action-title {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .data-action-desc {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .data-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--border-medium);
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 500;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .data-btn svg {
    width: 16px;
    height: 16px;
  }

  .data-btn:hover {
    background: var(--bg-elevated);
    border-color: var(--border-medium);
    color: var(--text-primary);
  }

  .data-btn.export:hover {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--bg-primary);
  }

  .data-btn.danger {
    border-color: rgba(239, 68, 68, 0.5);
    color: #ef4444;
  }

  .data-btn.danger:hover {
    background: #ef4444;
    border-color: #ef4444;
    color: white;
  }

  .data-btn.help:hover {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--bg-primary);
  }

  .import-status {
    margin-top: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    text-align: center;
    background: var(--accent-glow);
    color: var(--accent);
  }

  .import-status.error {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  /* About tab */
  .about-header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .about-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .about-version {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.8rem;
    color: var(--text-muted);
    background: var(--bg-tertiary);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }

  .about-description {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }

  .about-author {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .author-name {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .author-links {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .author-link {
    font-size: 0.85rem;
    color: var(--accent);
    text-decoration: none;
  }

  .author-link:hover {
    text-decoration: underline;
  }

  .author-separator {
    color: var(--text-muted);
  }

  .about-links {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .about-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
    text-decoration: none;
    padding: 0.5rem 0;
    transition: color var(--transition-fast);
  }

  .about-link:hover {
    color: var(--accent);
  }

  .about-link svg {
    width: 18px;
    height: 18px;
  }

  .about-license {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0;
  }
</style>
