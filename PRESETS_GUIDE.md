# Event Presets Guide

This guide covers all available presets and how to use them effectively.

## What are Presets?

Presets are pre-configured event templates with roles already set up for specific games. Instead of manually creating an event and adding each role, you can use a preset to instantly create a fully-configured event.

## Using Presets

### Basic Usage

```
!preset <preset-name> <date-time> [custom-description]
```

**Examples:**
```
!preset overwatch 2026-02-15 20:00
!preset helldivers 2026-02-16 19:00 Hellmire campaign
!preset wow-raid 2026-02-17 20:00 Mythic+ keys
```

### Listing Available Presets

```
!presets
```

This shows all available presets with their roles and slot limits.

## Available Presets

### FPS/Shooter Games

#### Overwatch
```
!preset overwatch 2026-02-15 20:00
```
- **Players:** 5
- **Roles:** Tank (1), Damage (2), Support (2)
- **Duration:** 90 minutes
- **Best for:** Competitive matches, quick play sessions

#### Valorant
```
!preset valorant 2026-02-15 20:00
```
- **Players:** 5
- **Roles:** Duelist (2), Controller (1), Sentinel (1), Initiator (1)
- **Duration:** 90 minutes
- **Best for:** Competitive 5-stack

#### Counter-Strike
```
!preset csgo 2026-02-15 20:00
```
- **Players:** 5
- **Roles:** Entry Fragger (1), AWPer (1), Support (1), Lurker (1), IGL (1)
- **Duration:** 90 minutes
- **Best for:** Competitive matches, scrims

#### Apex Legends
```
!preset apex 2026-02-15 20:00
```
- **Players:** 3
- **Roles:** Legend (3)
- **Duration:** 60 minutes
- **Best for:** Ranked/casual trios

#### Call of Duty: Warzone
```
!preset cod-warzone 2026-02-15 20:00
```
- **Players:** 4
- **Roles:** Operator (4)
- **Duration:** 90 minutes
- **Best for:** Quads, battle royale

#### Escape from Tarkov
```
!preset tarkov 2026-02-15 20:00
```
- **Players:** 5
- **Roles:** PMC (5)
- **Duration:** 90 minutes
- **Best for:** Raid groups

### Co-op/PvE Games

#### Helldivers 2
```
!preset helldivers 2026-02-15 20:00
```
- **Players:** 4
- **Roles:** Helldiver (4)
- **Duration:** 120 minutes
- **Best for:** Spreading managed democracy

#### The Division
```
!preset division 2026-02-15 20:00
```
- **Players:** 4
- **Roles:** Healer (1), DPS (2), Specialist (1)
- **Duration:** 120 minutes
- **Best for:** Missions, Dark Zone, raids

#### Phasmophobia
```
!preset phasmophobia 2026-02-15 20:00
```
- **Players:** 4
- **Roles:** Investigator (4)
- **Duration:** 90 minutes
- **Best for:** Ghost hunting sessions

### MMO Raids

#### World of Warcraft
```
!preset wow-raid 2026-02-15 20:00
```
- **Players:** 20
- **Roles:** Tank (2), Healer (4), DPS (14)
- **Duration:** 180 minutes
- **Best for:** Raid nights, mythic progression

#### Final Fantasy XIV
```
!preset ffxiv-raid 2026-02-15 20:00
```
- **Players:** 8
- **Roles:** Tank (2), Healer (2), DPS (4)
- **Duration:** 120 minutes
- **Best for:** Savage raids, extreme trials

#### Destiny 2
```
!preset destiny-raid 2026-02-15 20:00
```
- **Players:** 6
- **Roles:** Raider (6)
- **Duration:** 180 minutes
- **Best for:** Raids, dungeons

### MOBA Games

#### League of Legends
```
!preset league 2026-02-15 20:00
```
- **Players:** 5
- **Roles:** Top (1), Jungle (1), Mid (1), ADC (1), Support (1)
- **Duration:** 90 minutes
- **Best for:** 5-man queue, clash tournaments

### Survival/Sandbox Games

#### Minecraft
```
!preset minecraft 2026-02-15 20:00
```
- **Players:** Unlimited
- **Roles:** Builder (∞), Miner (∞), Explorer (∞)
- **Duration:** 120 minutes
- **Best for:** Building sessions, server events

#### Rust
```
!preset rust 2026-02-15 20:00
```
- **Players:** Unlimited
- **Roles:** Farmer (∞), Builder (∞), PvP (∞)
- **Duration:** 180 minutes
- **Best for:** Wipe day, base building, raids

#### Sea of Thieves
```
!preset sea-of-thieves 2026-02-15 20:00
```
- **Players:** 4
- **Roles:** Captain (1), Crew (3)
- **Duration:** 120 minutes
- **Best for:** Galleon adventures, treasure hunting

### Social/Party Games

#### Among Us
```
!preset among-us 2026-02-15 20:00
```
- **Players:** 10
- **Roles:** Crewmate (10)
- **Duration:** 60 minutes
- **Best for:** Full lobby games

### Tabletop/RPG

#### Dungeons & Dragons
```
!preset dnd 2026-02-15 20:00
```
- **Players:** 6
- **Roles:** DM (1), Player (5)
- **Duration:** 240 minutes (4 hours)
- **Best for:** Weekly sessions, one-shots

## Customizing Preset Events

### Override Description

Add a custom description after the date:

```
!preset overwatch 2026-02-15 20:00 Push to Grandmaster!
```

### When to Use Presets vs Custom Events

**Use Presets when:**
- Playing popular games with standard roles
- Want quick setup
- Event structure matches the preset

**Create Custom Events when:**
- Game not in presets
- Need different role configurations
- Hosting unique events (tournaments, tryouts, etc.)

## Creating Your Own Presets

You can add custom presets by editing `presets.json`:

```json
{
  "your-game": {
    "name": "Your Game Name",
    "description": "Default description",
    "duration": 120,
    "maxParticipants": 8,
    "roles": [
      { "name": "Role1", "emoji": "⚔️", "maxSlots": 4 },
      { "name": "Role2", "emoji": "🛡️", "maxSlots": 4 }
    ]
  }
}
```

### Preset Template Fields

- **name** - Display name shown in the event
- **description** - Default description (users can override)
- **duration** - Event length in minutes
- **maxParticipants** - Total player limit (use 0 for unlimited)
- **roles** - Array of signup roles:
  - **name** - Role display name
  - **emoji** - Role emoji icon
  - **maxSlots** - Max people in this role (use `null` for unlimited)

### Example: Adding a New Game

Let's add "Lethal Company" to presets:

```json
{
  "lethal-company": {
    "name": "Lethal Company",
    "description": "Meet the quota or die trying",
    "duration": 90,
    "maxParticipants": 4,
    "roles": [
      { "name": "Employee", "emoji": "👷", "maxSlots": 4 }
    ]
  }
}
```

Then use it:
```
!preset lethal-company 2026-02-15 20:00 Experimentation run
```

### Tips for Custom Presets

1. **Choose descriptive names** - Use lowercase with hyphens
2. **Pick relevant emojis** - Visual cues help users quickly identify roles
3. **Set realistic durations** - Consider typical session lengths
4. **Balance role slots** - Match actual game requirements
5. **Test your preset** - Create a test event to verify it works

## Preset Best Practices

### For Event Organizers

1. **Use presets for recurring events** - Saves time on weekly raids/sessions
2. **Customize descriptions** - Add specific goals or requirements
3. **Check roles before posting** - Verify the preset matches your needs
4. **Communicate time zones** - Specify timezone in description if needed

### For Players

1. **Sign up early** - Popular roles fill quickly
2. **Check event time** - Verify it works with your schedule
3. **Respect role limits** - Don't ask for multiple roles
4. **Leave events you can't attend** - Use the "Leave Event" button

## Frequently Asked Questions

### Can I modify a preset event after creation?

Yes! Use `!addrole` to add more roles or create a custom event instead.

### Can I use presets for recurring events?

Absolutely! Presets are perfect for weekly events like raid nights.

### What if my game isn't in the presets?

You can either:
1. Add it to `presets.json` yourself
2. Use `!create` to make a custom event
3. Request it be added to the default presets

### Can I delete a preset?

Remove it from `presets.json` and restart the bot. Events already created won't be affected.

### Do presets work with Google Calendar?

Yes! Preset events sync to Google Calendar just like custom events.

## Need More Presets?

If you'd like to see more games added to the default presets, you can:

1. Edit `presets.json` yourself
2. Share your custom presets with the community
3. Submit suggestions for new default presets

Happy gaming! 🎮
