# Claude Coach

Claude Coach allows you to use Claude to create custom-tailored training programs for triathlons, marathons, and other endurance activities. Using a data-driven approach and principles from top training plans, Claude will create a training plan that's uniquely fit for you, your personal fitness, and the constraints you have in the next couple of weeks. Maybe you're recovering from an injury, maybe you're traveling and don't have access to a pool or track in a certain week - tell Claude about it and it'll create a plan that works for you.

The output is a beautiful training plan app that allows you to add, edit, or move workouts, mark them as complete, and update key training data like heart rate zones, LTHR, threshold paces, FTP, and others. Your data is kept locally in your browser.

Workouts can be exported as simple calendar events (.ics), Zwift (.zwo), Garmin (.fit), or TrainerRoad/ERG (.mrc) workouts.

## Example

## Installation & Creating a training plan

I happen to work at Anthropic, so this tool is optimized for Claude. To use this tool, you need access to Claude.ai or Claude Code with network access for Skills. Depending on user/admin settings, Skills may have full, partial, or no network access.

### Installing the Skill

First, [download the latest skill from GitHub Releases](https://github.com/felixrieseberg/claude-coach/releases/latest/download/coach-skill.zip).

- If you're using Claude.ai, open the Settings, navigate to Capabilities, then click the `+ Add` button. Upload the `coach-skill.zip` file you just downloaded.
- If you're using Claude Code, run `/install-skill` and provide the path to the `coach-skill.zip` file you downloaded.

### Creating a plan

Use the most capable model available to you (as I'm writing this, that's Opus 4.5). Prompt Claude with something like this:

> Help me create a training plan for the Ironman 70.3 Oceanside on March 29th 2026 using the "coach" skill.

Claude will ask how you'd like to provide your fitness data. You have two options: You can either tell Claude about your fitness history manually - or you can give it access to your Strava activities. I recommend the later - data doesn't lie and more data allows Claude to make a training plan that really fits you.

#### Option 1: Connect to Strava (Recommended)

The easiest way to get a personalized plan is to let Claude analyze your Strava training history. This gives Claude real data about your current fitness, training patterns, and progress.

Claude needs a `Client ID` and `Client Secret` to access your Strava activities. You're only giving Claude access to your data - nobody else gets to see it.

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api) and log in with your Strava account
2. You'll see a form titled "My API Application" - fill it out:
   - **Application Name**: Enter anything you like (e.g., "Claude Coach")
   - **Category**: Select "Data Importer"
   - **Club**: Leave this blank
   - **Website**: Enter any URL (e.g., `https://claude.ai`)
   - **Application Description**: Enter anything (e.g., "Training plan generation")
   - **Authorization Callback Domain**: Enter `localhost`
3. Check the box to agree to Strava's API Agreement and click **Create**
4. Copy your **Client ID** and **Client Secret** and give them to Claude when prompted

#### Option 2: Manual Entry

Don't use Strava, or prefer not to connect it? No problem. You can tell Claude about your fitness directly. Be prepared to share:

**Current Training (recent 4-8 weeks):**

- Weekly training hours by sport (swim/bike/run)
- Typical long session distances (longest ride, longest run, etc.)
- Training consistency (how many weeks have you been training regularly?)

**Performance Benchmarks (any you know):**

- Bike FTP (Functional Threshold Power) in watts
- Run threshold pace or recent race times (5K, 10K, half marathon, etc.)
- Swim CSS (Critical Swim Speed) or recent time trial (e.g., 1000m time)
- Max heart rate and/or lactate threshold heart rate

### Telling Claude about your event & constraints

In the next step, Claude will ask you about yourself, the event you're training for, and any constraints it should keep in mind. Examples of information you'd tell any coach:

**Training History:**

- Years in the sport
- Previous races completed (distances and approximate times)
- Any recent breaks from training

**Constraints & Considerations:**

- Injuries or health issues
- Schedule limitations (work travel, family, etc.)
- Equipment access (pool availability, trainer, etc.)

Claude will use this information to create a plan tailored to your current fitness level. The more detail you provide, the better your plan will be.

# About

License: MIT.
