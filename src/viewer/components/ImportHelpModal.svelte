<script lang="ts">
  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let activeTab = $state<"calendar" | "zwift" | "garmin" | "trainerroad" | "generic">("calendar");

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("modal-overlay")) {
      onClose();
    }
  }

  const tabs = [
    { id: "calendar" as const, label: "Calendar Apps" },
    { id: "zwift" as const, label: "Zwift" },
    { id: "garmin" as const, label: "Garmin" },
    { id: "trainerroad" as const, label: "TrainerRoad" },
    { id: "generic" as const, label: "Other Apps" },
  ];
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
  <div class="modal import-help-modal">
    <div class="modal-fixed-header">
      <div class="modal-header">
        <div>
          <h2 class="modal-title">Import Workouts to Your Apps</h2>
          <p class="modal-subtitle">Step-by-step guides for importing your exported files</p>
        </div>
        <button class="modal-close" onclick={onClose}>×</button>
      </div>

      <div class="help-tabs">
        {#each tabs as tab}
          <button
            class="help-tab"
            class:active={activeTab === tab.id}
            onclick={() => (activeTab = tab.id)}
          >
            {tab.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="modal-body">
      <!-- Calendar Apps Tab -->
      {#if activeTab === "calendar"}
        <div class="help-section">
          <div class="file-type-badge">.ics files</div>
          <p class="help-intro">
            Calendar files (.ics) work with most calendar applications. Your workouts will appear as
            events on the scheduled dates.
          </p>

          <div class="app-guide">
            <h4 class="app-name">
              <span class="app-logo">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z"
                  />
                </svg>
              </span>
              Google Calendar
            </h4>
            <ol class="step-list">
              <li>Open <strong>Google Calendar</strong> in your web browser</li>
              <li>
                Click the <strong>+</strong> button next to "Other calendars" in the left sidebar
              </li>
              <li>Select <strong>"Import"</strong></li>
              <li>
                Click <strong>"Select file from your computer"</strong> and choose the .ics file
              </li>
              <li>
                Choose which calendar to add the events to, or create a new one called "Training
                Plan"
              </li>
              <li>Click <strong>"Import"</strong></li>
            </ol>
            <div class="tip">
              <strong>Tip:</strong> Create a separate calendar for your training plan so you can easily
              show/hide workouts and use a distinct color.
            </div>
          </div>

          <div class="app-guide">
            <h4 class="app-name">
              <span class="app-logo">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                  />
                </svg>
              </span>
              Apple Calendar (Mac)
            </h4>
            <ol class="step-list">
              <li>Open the <strong>Calendar</strong> app on your Mac</li>
              <li>
                Go to <strong>File</strong> → <strong>Import...</strong> in the menu bar
              </li>
              <li>Select the .ics file and click <strong>"Import"</strong></li>
              <li>Choose which calendar to add the events to</li>
              <li>Click <strong>"OK"</strong></li>
            </ol>
            <div class="tip">
              <strong>Alternative:</strong> You can also double-click the .ics file to open it directly
              in Calendar.
            </div>
          </div>

          <div class="app-guide">
            <h4 class="app-name">
              <span class="app-logo">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                  />
                </svg>
              </span>
              Apple Calendar (iPhone/iPad)
            </h4>
            <ol class="step-list">
              <li>Email the .ics file to yourself or save it to iCloud Drive</li>
              <li>Open the file on your device</li>
              <li>Tap <strong>"Add All"</strong> to add the events</li>
              <li>Choose which calendar to save them to</li>
            </ol>
          </div>

          <div class="app-guide">
            <h4 class="app-name">
              <span class="app-logo outlook-color">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6zm2 0l8 5 8-5H4zm0 2v10h16V8l-8 5-8-5z"
                  />
                </svg>
              </span>
              Outlook Calendar
            </h4>
            <ol class="step-list">
              <li>Open <strong>Outlook</strong> (desktop or web)</li>
              <li>Go to the <strong>Calendar</strong> view</li>
              <li>
                Click <strong>"Add calendar"</strong> →
                <strong>"Upload from file"</strong>
              </li>
              <li>Browse to select your .ics file</li>
              <li>Choose a calendar and click <strong>"Import"</strong></li>
            </ol>
          </div>
        </div>
      {/if}

      <!-- Zwift Tab -->
      {#if activeTab === "zwift"}
        <div class="help-section">
          <div class="file-type-badge">.zwo files</div>
          <p class="help-intro">
            Zwift workout files (.zwo) contain structured workouts with power targets. These work
            for bike and run workouts in Zwift.
          </p>

          <div class="app-guide">
            <h4 class="app-name">
              <span class="app-logo zwift-color">
                <svg
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M10.952 6.776a5.452 5.452 0 0 0 0 10.905h4.258L6.245 33.019a5.452 5.452 0 0 0 4.707 8.204h22.524a5.452 5.452 0 1 0 0-10.905H28.74L42.5 6.776Z"
                  />
                </svg>
              </span>
              Zwift (Windows)
            </h4>
            <ol class="step-list">
              <li>Close Zwift if it's currently running</li>
              <li>Open File Explorer and navigate to:</li>
              <li>
                <code class="path">Documents\Zwift\Workouts\[Your Zwift ID]</code>
              </li>
              <li>
                If you don't know your Zwift ID, look for a folder with numbers (like "123456")
              </li>
              <li>Copy your .zwo files into this folder</li>
              <li>Launch Zwift and go to <strong>Workouts</strong></li>
              <li>
                Click <strong>"Custom Workouts"</strong> - your workouts should appear there
              </li>
            </ol>
            <div class="tip">
              <strong>Can't find the folder?</strong> You can also open Zwift, go to Workouts, and look
              for a "Custom Workouts" section. Zwift will create the folder when you first access workouts.
            </div>
          </div>

          <div class="app-guide">
            <h4 class="app-name">
              <span class="app-logo zwift-color">
                <svg
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M10.952 6.776a5.452 5.452 0 0 0 0 10.905h4.258L6.245 33.019a5.452 5.452 0 0 0 4.707 8.204h22.524a5.452 5.452 0 1 0 0-10.905H28.74L42.5 6.776Z"
                  />
                </svg>
              </span>
              Zwift (Mac)
            </h4>
            <ol class="step-list">
              <li>Close Zwift if it's currently running</li>
              <li>
                Open Finder and press <strong>Cmd + Shift + G</strong> to open "Go to Folder"
              </li>
              <li>Type this path and press Enter:</li>
              <li>
                <code class="path">~/Documents/Zwift/Workouts/[Your Zwift ID]</code>
              </li>
              <li>Copy your .zwo files into this folder</li>
              <li>Launch Zwift and go to <strong>Workouts</strong></li>
              <li>
                Your custom workouts will appear under
                <strong>"Custom Workouts"</strong>
              </li>
            </ol>
          </div>

          <div class="app-guide">
            <h4 class="app-name">
              <span class="app-logo zwift-color">
                <svg
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M10.952 6.776a5.452 5.452 0 0 0 0 10.905h4.258L6.245 33.019a5.452 5.452 0 0 0 4.707 8.204h22.524a5.452 5.452 0 1 0 0-10.905H28.74L42.5 6.776Z"
                  />
                </svg>
              </span>
              Zwift (iOS/Android)
            </h4>
            <p class="note">
              Unfortunately, Zwift mobile apps don't support importing custom .zwo files directly.
              You'll need to:
            </p>
            <ol class="step-list">
              <li>Import the workouts on a computer first (as described above)</li>
              <li>Make sure you're signed into the same Zwift account on both devices</li>
              <li>The workouts will sync and appear in your Custom Workouts on mobile</li>
            </ol>
          </div>

          <div class="warning-box">
            <strong>Important:</strong> Make sure your FTP is set correctly in your Zwift settings. The
            workout power targets are based on percentages of FTP.
          </div>
        </div>
      {/if}

      <!-- Garmin Tab -->
      {#if activeTab === "garmin"}
        <div class="help-section">
          <div class="file-type-badge">.fit files</div>
          <p class="help-intro">
            Garmin FIT files work with Garmin watches and bike computers. They include structured
            workout targets that your device will guide you through.
          </p>

          <div class="app-guide">
            <h4 class="app-name">
              <span class="app-logo">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M6.265 12.024a.289.289 0 0 0-.236-.146h-.182a.289.289 0 0 0-.234.146l-1.449 3.025c-.041.079.004.138.094.138h.335c.132 0 .193-.061.228-.134.037-.073.116-.234.13-.266.02-.045.083-.071.175-.071h1.559c.089 0 .148.016.175.071.018.035.098.179.136.256a.24.24 0 0 0 .234.142h.486c.089 0 .13-.069.098-.132-.034-.061-1.549-3.029-1.549-3.029zm-.914 2.224c-.089 0-.132-.067-.094-.148l.571-1.222c.039-.081.1-.081.136 0l.555 1.222c.037.081-.006.148-.096.148H5.351zm12.105-2.201v3.001c0 .083.073.138.163.138h.396c.089 0 .163-.057.163-.146v-2.998c0-.089-.059-.163-.148-.163h-.411c-.09-.001-.163.054-.163.168zm-6.631 1.88c-.051-.073-.022-.154.063-.181 0 0 .342-.102.506-.25.165-.146.246-.36.246-.636a1 1 0 0 0-.096-.457.787.787 0 0 0-.27-.303 1.276 1.276 0 0 0-.423-.171c-.165-.035-.386-.047-.386-.047a8.81 8.81 0 0 0-.325-.008H8.495a.164.164 0 0 0-.163.163v2.998c0 .089.073.146.163.146h.388c.089 0 .163-.057.163-.146v-1.193s.002 0 .002-.002l.738-.002c.089 0 .205.061.258.134l.766 1.077c.071.096.138.132.228.132h.508c.089 0 .104-.085.073-.128-.032-.038-.794-1.126-.794-1.126zm-.311-.61a1.57 1.57 0 0 1-.213.028 8.807 8.807 0 0 1-.325.006h-.763a.164.164 0 0 1-.163-.163v-.608c0-.089.073-.163.163-.163h.762c.089 0 .236.004.325.006 0 0 .114.004.213.028a.629.629 0 0 1 .24.098.358.358 0 0 1 .126.148.473.473 0 0 1 0 .374.352.352 0 0 1-.126.148.617.617 0 0 1-.239.098zm11.803-1.439c-.089 0-.163.059-.163.146v1.919c0 .089-.051.11-.114.047l-1.921-1.992a.376.376 0 0 0-.276-.118h-.362c-.114 0-.163.061-.163.122v3.068c0 .061.059.12.148.12h.362c.089 0 .152-.049.152-.132l.002-2.021c0-.089.051-.11.114-.045l2.004 2.082a.36.36 0 0 0 .279.116h.272a.164.164 0 0 0 .163-.163v-2.986a.164.164 0 0 0-.163-.163h-.334zm-7.835 1.87c-.043.079-.116.077-.159 0l-.939-1.724a.262.262 0 0 0-.236-.146h-.51a.164.164 0 0 0-.163.163v2.996c0 .089.059.15.163.15h.317c.089 0 .154-.057.154-.142 0-.041.002-2.179.004-2.179.004 0 1.173 2.177 1.173 2.177a.105.105 0 0 0 .189 0s1.179-2.173 1.181-2.173c.004 0 .002 2.11.002 2.173 0 .087.069.142.159.142h.364c.089 0 .163-.045.163-.163V12.04a.164.164 0 0 0-.163-.163h-.488a.265.265 0 0 0-.244.142l-.967 1.729zM0 13.529c0 1.616 1.653 1.697 1.984 1.697 1.098 0 1.561-.297 1.58-.309a.29.29 0 0 0 .152-.264v-1.116a.186.186 0 0 0-.187-.187H2.151c-.104 0-.171.083-.171.187v.116c0 .104.067.187.171.187h.797a.14.14 0 0 1 .14.14v.52c-.157.065-.874.274-1.451.136-.836-.199-.901-.89-.901-1.096 0-.173.053-1.043 1.079-1.13.831-.071 1.378.264 1.384.268.098.051.199.014.254-.089l.104-.209c.043-.085.028-.175-.077-.246-.006-.004-.59-.319-1.494-.319C.055 11.813 0 13.354 0 13.529z"
                  />
                </svg>
              </span>
              Garmin Connect (Web - Recommended)
            </h4>
            <ol class="step-list">
              <li>
                Go to <a href="https://connect.garmin.com" target="_blank" rel="noopener"
                  >connect.garmin.com</a
                > and sign in
              </li>
              <li>
                Click <strong>"Training"</strong> in the left menu
              </li>
              <li>Select <strong>"Workouts"</strong></li>
              <li>
                Click <strong>"Import Workout"</strong> in the top right
              </li>
              <li>Select your .fit file and click <strong>"Import"</strong></li>
              <li>
                Review the workout and click <strong>"Save"</strong>
              </li>
              <li>
                To send to your watch: click <strong>"Send to Device"</strong>
                and select your Garmin device
              </li>
            </ol>
            <div class="tip">
              <strong>Tip:</strong> You can schedule workouts directly to specific dates in your Garmin
              calendar.
            </div>
          </div>

          <div class="app-guide">
            <h4 class="app-name">
              <span class="app-logo">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M6.265 12.024a.289.289 0 0 0-.236-.146h-.182a.289.289 0 0 0-.234.146l-1.449 3.025c-.041.079.004.138.094.138h.335c.132 0 .193-.061.228-.134.037-.073.116-.234.13-.266.02-.045.083-.071.175-.071h1.559c.089 0 .148.016.175.071.018.035.098.179.136.256a.24.24 0 0 0 .234.142h.486c.089 0 .13-.069.098-.132-.034-.061-1.549-3.029-1.549-3.029zm-.914 2.224c-.089 0-.132-.067-.094-.148l.571-1.222c.039-.081.1-.081.136 0l.555 1.222c.037.081-.006.148-.096.148H5.351zm12.105-2.201v3.001c0 .083.073.138.163.138h.396c.089 0 .163-.057.163-.146v-2.998c0-.089-.059-.163-.148-.163h-.411c-.09-.001-.163.054-.163.168zm-6.631 1.88c-.051-.073-.022-.154.063-.181 0 0 .342-.102.506-.25.165-.146.246-.36.246-.636a1 1 0 0 0-.096-.457.787.787 0 0 0-.27-.303 1.276 1.276 0 0 0-.423-.171c-.165-.035-.386-.047-.386-.047a8.81 8.81 0 0 0-.325-.008H8.495a.164.164 0 0 0-.163.163v2.998c0 .089.073.146.163.146h.388c.089 0 .163-.057.163-.146v-1.193s.002 0 .002-.002l.738-.002c.089 0 .205.061.258.134l.766 1.077c.071.096.138.132.228.132h.508c.089 0 .104-.085.073-.128-.032-.038-.794-1.126-.794-1.126zm-.311-.61a1.57 1.57 0 0 1-.213.028 8.807 8.807 0 0 1-.325.006h-.763a.164.164 0 0 1-.163-.163v-.608c0-.089.073-.163.163-.163h.762c.089 0 .236.004.325.006 0 0 .114.004.213.028a.629.629 0 0 1 .24.098.358.358 0 0 1 .126.148.473.473 0 0 1 0 .374.352.352 0 0 1-.126.148.617.617 0 0 1-.239.098zm11.803-1.439c-.089 0-.163.059-.163.146v1.919c0 .089-.051.11-.114.047l-1.921-1.992a.376.376 0 0 0-.276-.118h-.362c-.114 0-.163.061-.163.122v3.068c0 .061.059.12.148.12h.362c.089 0 .152-.049.152-.132l.002-2.021c0-.089.051-.11.114-.045l2.004 2.082a.36.36 0 0 0 .279.116h.272a.164.164 0 0 0 .163-.163v-2.986a.164.164 0 0 0-.163-.163h-.334zm-7.835 1.87c-.043.079-.116.077-.159 0l-.939-1.724a.262.262 0 0 0-.236-.146h-.51a.164.164 0 0 0-.163.163v2.996c0 .089.059.15.163.15h.317c.089 0 .154-.057.154-.142 0-.041.002-2.179.004-2.179.004 0 1.173 2.177 1.173 2.177a.105.105 0 0 0 .189 0s1.179-2.173 1.181-2.173c.004 0 .002 2.11.002 2.173 0 .087.069.142.159.142h.364c.089 0 .163-.045.163-.163V12.04a.164.164 0 0 0-.163-.163h-.488a.265.265 0 0 0-.244.142l-.967 1.729zM0 13.529c0 1.616 1.653 1.697 1.984 1.697 1.098 0 1.561-.297 1.58-.309a.29.29 0 0 0 .152-.264v-1.116a.186.186 0 0 0-.187-.187H2.151c-.104 0-.171.083-.171.187v.116c0 .104.067.187.171.187h.797a.14.14 0 0 1 .14.14v.52c-.157.065-.874.274-1.451.136-.836-.199-.901-.89-.901-1.096 0-.173.053-1.043 1.079-1.13.831-.071 1.378.264 1.384.268.098.051.199.014.254-.089l.104-.209c.043-.085.028-.175-.077-.246-.006-.004-.59-.319-1.494-.319C.055 11.813 0 13.354 0 13.529z"
                  />
                </svg>
              </span>
              Garmin Connect (Mobile App)
            </h4>
            <ol class="step-list">
              <li>Open the <strong>Garmin Connect</strong> app</li>
              <li>
                Tap <strong>"More"</strong> (bottom right) →
                <strong>"Training & Planning"</strong>
              </li>
              <li>Tap <strong>"Workouts"</strong></li>
              <li>Tap the <strong>+</strong> button → <strong>"Import"</strong></li>
              <li>Browse to select your .fit file</li>
              <li>
                Tap <strong>"Send to Device"</strong> to sync to your watch
              </li>
            </ol>
          </div>

          <div class="app-guide">
            <h4 class="app-name">
              <span class="app-logo">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M6.265 12.024a.289.289 0 0 0-.236-.146h-.182a.289.289 0 0 0-.234.146l-1.449 3.025c-.041.079.004.138.094.138h.335c.132 0 .193-.061.228-.134.037-.073.116-.234.13-.266.02-.045.083-.071.175-.071h1.559c.089 0 .148.016.175.071.018.035.098.179.136.256a.24.24 0 0 0 .234.142h.486c.089 0 .13-.069.098-.132-.034-.061-1.549-3.029-1.549-3.029zm-.914 2.224c-.089 0-.132-.067-.094-.148l.571-1.222c.039-.081.1-.081.136 0l.555 1.222c.037.081-.006.148-.096.148H5.351zm12.105-2.201v3.001c0 .083.073.138.163.138h.396c.089 0 .163-.057.163-.146v-2.998c0-.089-.059-.163-.148-.163h-.411c-.09-.001-.163.054-.163.168zm-6.631 1.88c-.051-.073-.022-.154.063-.181 0 0 .342-.102.506-.25.165-.146.246-.36.246-.636a1 1 0 0 0-.096-.457.787.787 0 0 0-.27-.303 1.276 1.276 0 0 0-.423-.171c-.165-.035-.386-.047-.386-.047a8.81 8.81 0 0 0-.325-.008H8.495a.164.164 0 0 0-.163.163v2.998c0 .089.073.146.163.146h.388c.089 0 .163-.057.163-.146v-1.193s.002 0 .002-.002l.738-.002c.089 0 .205.061.258.134l.766 1.077c.071.096.138.132.228.132h.508c.089 0 .104-.085.073-.128-.032-.038-.794-1.126-.794-1.126zm-.311-.61a1.57 1.57 0 0 1-.213.028 8.807 8.807 0 0 1-.325.006h-.763a.164.164 0 0 1-.163-.163v-.608c0-.089.073-.163.163-.163h.762c.089 0 .236.004.325.006 0 0 .114.004.213.028a.629.629 0 0 1 .24.098.358.358 0 0 1 .126.148.473.473 0 0 1 0 .374.352.352 0 0 1-.126.148.617.617 0 0 1-.239.098zm11.803-1.439c-.089 0-.163.059-.163.146v1.919c0 .089-.051.11-.114.047l-1.921-1.992a.376.376 0 0 0-.276-.118h-.362c-.114 0-.163.061-.163.122v3.068c0 .061.059.12.148.12h.362c.089 0 .152-.049.152-.132l.002-2.021c0-.089.051-.11.114-.045l2.004 2.082a.36.36 0 0 0 .279.116h.272a.164.164 0 0 0 .163-.163v-2.986a.164.164 0 0 0-.163-.163h-.334zm-7.835 1.87c-.043.079-.116.077-.159 0l-.939-1.724a.262.262 0 0 0-.236-.146h-.51a.164.164 0 0 0-.163.163v2.996c0 .089.059.15.163.15h.317c.089 0 .154-.057.154-.142 0-.041.002-2.179.004-2.179.004 0 1.173 2.177 1.173 2.177a.105.105 0 0 0 .189 0s1.179-2.173 1.181-2.173c.004 0 .002 2.11.002 2.173 0 .087.069.142.159.142h.364c.089 0 .163-.045.163-.163V12.04a.164.164 0 0 0-.163-.163h-.488a.265.265 0 0 0-.244.142l-.967 1.729zM0 13.529c0 1.616 1.653 1.697 1.984 1.697 1.098 0 1.561-.297 1.58-.309a.29.29 0 0 0 .152-.264v-1.116a.186.186 0 0 0-.187-.187H2.151c-.104 0-.171.083-.171.187v.116c0 .104.067.187.171.187h.797a.14.14 0 0 1 .14.14v.52c-.157.065-.874.274-1.451.136-.836-.199-.901-.89-.901-1.096 0-.173.053-1.043 1.079-1.13.831-.071 1.378.264 1.384.268.098.051.199.014.254-.089l.104-.209c.043-.085.028-.175-.077-.246-.006-.004-.59-.319-1.494-.319C.055 11.813 0 13.354 0 13.529z"
                  />
                </svg>
              </span>
              Direct USB Transfer
            </h4>
            <ol class="step-list">
              <li>Connect your Garmin device to your computer via USB</li>
              <li>Open the device in File Explorer/Finder (it appears as a drive)</li>
              <li>
                Navigate to <code class="path">GARMIN\WORKOUT</code> or
                <code class="path">GARMIN\NewFiles</code>
              </li>
              <li>Copy your .fit files into this folder</li>
              <li>Safely eject the device</li>
              <li>
                On your watch, go to an activity and select
                <strong>"Do Workout"</strong> to find your imported workout
              </li>
            </ol>
            <div class="warning-box">
              <strong>Note:</strong> Folder names may vary slightly by device model. If WORKOUT folder
              doesn't exist, try NewFiles instead.
            </div>
          </div>
        </div>
      {/if}

      <!-- TrainerRoad Tab -->
      {#if activeTab === "trainerroad"}
        <div class="help-section">
          <div class="file-type-badge">.mrc files</div>
          <p class="help-intro">
            MRC (ERG) files are a standard format for indoor cycling workouts. TrainerRoad and many
            other trainer apps support this format.
          </p>

          <div class="app-guide">
            <h4 class="app-name">
              <span class="app-logo trainerroad-color">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M20.289 14.039c.157-.064.44-.199.51-.234 1.105-.56 1.92-1.222 2.42-1.966.527-.756.8-1.658.78-2.579 0-1.253-.456-2.193-1.398-2.874-.922-.668-2.225-.971-3.874-1.012H1.357L0 8.421h5.528c.014 0 .028.005.038.016a.02.02 0 01.004.019L2.785 16.85h3.668c.063 0 .12-.041.14-.102l2.759-8.303a.043.043 0 01.042-.024l2.823.001c.014 0 .028.005.038.015a.02.02 0 01.004.019L9.473 16.85h3.669c.064 0 .12-.042.14-.103l.742-2.26a.043.043 0 01.042-.024s2.452.005 2.452.003c.864 1.363 1.807 2.878 2.616 4.16l3.844-.002c.118 0 .19-.13.125-.229l-2.832-4.321c-.01-.022.013-.025.018-.035zm-.45-3.355c-.437.412-1.185.612-2.163.612h-2.583l.952-2.874 2.353.001c1.14.017 1.826.514 1.838 1.337.007.35-.138.688-.397.924z"
                  />
                </svg>
              </span>
              TrainerRoad (Desktop)
            </h4>
            <ol class="step-list">
              <li>Open the <strong>TrainerRoad</strong> application</li>
              <li>Go to <strong>"Career"</strong> → <strong>"Workouts"</strong></li>
              <li>
                Click <strong>"Import Workout"</strong> or drag and drop your .mrc file
              </li>
              <li>The workout will appear in your personal workout library</li>
              <li>You can now add it to your calendar or start it directly</li>
            </ol>
            <div class="tip">
              <strong>Tip:</strong> TrainerRoad will automatically convert the workout to use your current
              FTP settings.
            </div>
          </div>

          <div class="app-guide">
            <h4 class="app-name">
              <span class="app-logo trainerroad-color">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M20.289 14.039c.157-.064.44-.199.51-.234 1.105-.56 1.92-1.222 2.42-1.966.527-.756.8-1.658.78-2.579 0-1.253-.456-2.193-1.398-2.874-.922-.668-2.225-.971-3.874-1.012H1.357L0 8.421h5.528c.014 0 .028.005.038.016a.02.02 0 01.004.019L2.785 16.85h3.668c.063 0 .12-.041.14-.102l2.759-8.303a.043.043 0 01.042-.024l2.823.001c.014 0 .028.005.038.015a.02.02 0 01.004.019L9.473 16.85h3.669c.064 0 .12-.042.14-.103l.742-2.26a.043.043 0 01.042-.024s2.452.005 2.452.003c.864 1.363 1.807 2.878 2.616 4.16l3.844-.002c.118 0 .19-.13.125-.229l-2.832-4.321c-.01-.022.013-.025.018-.035zm-.45-3.355c-.437.412-1.185.612-2.163.612h-2.583l.952-2.874 2.353.001c1.14.017 1.826.514 1.838 1.337.007.35-.138.688-.397.924z"
                  />
                </svg>
              </span>
              TrainerRoad (Mobile)
            </h4>
            <ol class="step-list">
              <li>Save the .mrc file to your phone (via email or cloud storage)</li>
              <li>Open the TrainerRoad app</li>
              <li>Go to <strong>"Train"</strong> → <strong>"Custom"</strong></li>
              <li>Tap <strong>"Import"</strong> and select your file</li>
            </ol>
          </div>

          <div class="app-guide">
            <h4 class="app-name">
              <span class="app-logo rouvy-color">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 4h8a5 5 0 0 1 0 10h-3l6 6h-4l-6-6H5V4zm2 2v6h6a3 3 0 0 0 0-6H7z" />
                </svg>
              </span>
              Rouvy
            </h4>
            <ol class="step-list">
              <li>Open Rouvy on your computer</li>
              <li>Go to <strong>"Workouts"</strong></li>
              <li>Click <strong>"Import"</strong></li>
              <li>Select your .mrc file</li>
              <li>The workout will be added to your library</li>
            </ol>
          </div>
        </div>
      {/if}

      <!-- Generic/Other Apps Tab -->
      {#if activeTab === "generic"}
        <div class="help-section">
          <p class="help-intro">
            Many training apps support standard file formats. Here's a general guide for different
            file types.
          </p>

          <div class="file-format-guide">
            <h4 class="format-title">
              <span class="file-type-badge small">.ics</span> Calendar Files
            </h4>
            <p>
              Universal calendar format. Works with virtually any calendar application including
              Google Calendar, Apple Calendar, Outlook, and more.
            </p>
            <div class="compatible-apps">
              <span class="app-tag">Google Calendar</span>
              <span class="app-tag">Apple Calendar</span>
              <span class="app-tag">Outlook</span>
              <span class="app-tag">Yahoo Calendar</span>
              <span class="app-tag">Thunderbird</span>
            </div>
          </div>

          <div class="file-format-guide">
            <h4 class="format-title">
              <span class="file-type-badge small">.zwo</span> Zwift Workout Files
            </h4>
            <p>
              Structured workouts with power/pace targets. Primarily designed for Zwift but some
              other apps can convert these.
            </p>
            <div class="compatible-apps">
              <span class="app-tag">Zwift</span>
              <span class="app-tag">What's on Zwift</span>
            </div>
          </div>

          <div class="file-format-guide">
            <h4 class="format-title">
              <span class="file-type-badge small">.fit</span> Garmin FIT Files
            </h4>
            <p>
              Industry-standard fitness file format. Works with Garmin devices and many other
              fitness platforms.
            </p>
            <div class="compatible-apps">
              <span class="app-tag">Garmin Connect</span>
              <span class="app-tag">Wahoo SYSTM</span>
              <span class="app-tag">Strava</span>
              <span class="app-tag">Training Peaks</span>
            </div>
          </div>

          <div class="file-format-guide">
            <h4 class="format-title">
              <span class="file-type-badge small">.mrc</span> ERG/MRC Files
            </h4>
            <p>
              Classic indoor trainer workout format. Widely supported by bike trainer applications.
            </p>
            <div class="compatible-apps">
              <span class="app-tag">TrainerRoad</span>
              <span class="app-tag">Rouvy</span>
              <span class="app-tag">Wahoo SYSTM</span>
              <span class="app-tag">PerfPro</span>
              <span class="app-tag">Golden Cheetah</span>
            </div>
          </div>

          <div class="general-tips">
            <h4>General Import Tips</h4>
            <ul>
              <li>Most apps have an "Import" option in the workouts or training section</li>
              <li>If drag-and-drop doesn't work, look for a menu option or button</li>
              <li>Some apps may require a premium subscription for workout imports</li>
              <li>Make sure your FTP/threshold settings are up to date in the target app</li>
              <li>If a workout looks wrong, check that units (watts, pace) match between apps</li>
            </ul>
          </div>
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

  .import-help-modal {
    background: var(--bg-secondary);
    border-radius: 20px;
    max-width: 700px;
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
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .modal-title {
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .modal-subtitle {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
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
    flex-shrink: 0;
  }

  .modal-close:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .help-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0 2rem 1rem;
    overflow-x: auto;
  }

  .help-tab {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 500;
    border: none;
    background: transparent;
    color: var(--text-muted);
    border-radius: 8px;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .help-tab:hover {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .help-tab.active {
    background: var(--accent);
    color: var(--bg-primary);
  }

  .modal-body {
    padding: 1.5rem 2rem 2rem;
    overflow-y: auto;
    flex: 1;
  }

  .help-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .file-type-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.4rem 0.8rem;
    background: var(--accent-glow);
    color: var(--accent);
    border-radius: 6px;
    font-family: "JetBrains Mono", monospace;
    font-size: 0.85rem;
    font-weight: 600;
    width: fit-content;
  }

  .file-type-badge.small {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }

  .help-intro {
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }

  .app-guide {
    background: var(--bg-tertiary);
    border-radius: 12px;
    padding: 1.25rem;
    border: 1px solid var(--border-subtle);
  }

  .app-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 1rem 0;
  }

  .app-logo {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    color: var(--text-primary);
  }

  .app-logo svg {
    width: 100%;
    height: 100%;
  }

  /* Brand colors */
  .app-logo.outlook-color {
    color: #0078d4;
  }

  .app-logo.zwift-color {
    color: #fc6719;
  }

  .app-logo.trainerroad-color {
    color: #e12726;
  }

  .app-logo.rouvy-color {
    color: #00a8e8;
  }

  .step-list {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.8;
  }

  .step-list li {
    margin-bottom: 0.5rem;
  }

  .step-list li:last-child {
    margin-bottom: 0;
  }

  .step-list strong {
    color: var(--text-primary);
  }

  .step-list a {
    color: var(--accent);
    text-decoration: none;
  }

  .step-list a:hover {
    text-decoration: underline;
  }

  .path {
    background: var(--bg-primary);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-family: "JetBrains Mono", monospace;
    font-size: 0.8rem;
    color: var(--accent);
    display: inline-block;
    margin: 0.25rem 0;
    word-break: break-all;
  }

  .tip {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: var(--accent-glow);
    border-radius: 8px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    border-left: 3px solid var(--accent);
  }

  .tip strong {
    color: var(--accent);
  }

  .note {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .warning-box {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: rgba(249, 115, 22, 0.1);
    border-radius: 8px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    border-left: 3px solid #f97316;
  }

  .warning-box strong {
    color: #f97316;
  }

  /* File format guides */
  .file-format-guide {
    background: var(--bg-tertiary);
    border-radius: 12px;
    padding: 1.25rem;
    border: 1px solid var(--border-subtle);
  }

  .format-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.75rem 0;
  }

  .file-format-guide p {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0 0 0.75rem 0;
  }

  .compatible-apps {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .app-tag {
    padding: 0.3rem 0.6rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .general-tips {
    background: var(--bg-tertiary);
    border-radius: 12px;
    padding: 1.25rem;
    border: 1px solid var(--border-subtle);
  }

  .general-tips h4 {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.75rem 0;
  }

  .general-tips ul {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.8;
  }

  .general-tips li {
    margin-bottom: 0.25rem;
  }

  /* Mobile adjustments */
  @media (max-width: 600px) {
    .modal-overlay {
      padding: 1rem;
      padding-top: 2vh;
    }

    .import-help-modal {
      max-height: calc(100vh - 4vh - 2rem);
    }

    .modal-header {
      padding: 1rem 1.25rem 0.75rem;
    }

    .modal-title {
      font-size: 1.2rem;
    }

    .help-tabs {
      padding: 0 1.25rem 0.75rem;
    }

    .help-tab {
      padding: 0.4rem 0.75rem;
      font-size: 0.8rem;
    }

    .modal-body {
      padding: 1rem 1.25rem 1.5rem;
    }

    .app-guide {
      padding: 1rem;
    }

    .path {
      font-size: 0.7rem;
    }
  }
</style>
