# Date & Time Format Guide

This guide explains the date and time format used by the Discord Event Bot.

## Format Overview

The bot uses **DD-MM-YYYY HH:MM** format with optional 12-hour AM/PM notation.

## Basic Format

```
DD-MM-YYYY HH:MM
```

Where:
- **DD** = Day (01-31)
- **MM** = Month (01-12)
- **YYYY** = Year (full 4 digits)
- **HH** = Hour (00-23 for 24-hour, or 01-12 for 12-hour with AM/PM)
- **MM** = Minutes (00-59)

## Supported Formats

### 24-Hour Format (Military Time)

```
15-02-2026 20:00    ✓ Valid (8:00 PM)
01-12-2026 14:30    ✓ Valid (2:30 PM)
25-03-2026 00:00    ✓ Valid (Midnight)
31-12-2026 23:59    ✓ Valid (11:59 PM)
```

### 12-Hour Format (AM/PM)

```
15-02-2026 08:00 PM    ✓ Valid (8:00 PM)
15-02-2026 08:00 pm    ✓ Valid (8:00 PM - case insensitive)
01-12-2026 02:30 PM    ✓ Valid (2:30 PM)
25-03-2026 12:00 AM    ✓ Valid (Midnight)
31-12-2026 11:59 PM    ✓ Valid (11:59 PM)
```

## Usage Examples

### Creating Events with !create

```
!create Raid Night | 15-02-2026 20:00 | Weekly raid | 120 | 20
!create Study Session | 20-02-2026 03:00 PM | Math study | 90 | 10
!create Movie Night | 25-03-2026 19:30 | Friday movie | 120 | 15
```

### Creating Events with !preset

```
!preset overwatch 15-02-2026 20:00
!preset overwatch 15-02-2026 08:00 PM
!preset helldivers 16-02-2026 19:00 Weekend squad
!preset dnd 18-02-2026 06:00 PM Campaign session
```

## Common Date Formats

### British/European Format (DD-MM-YYYY)
✓ **Used by this bot**
- 15-02-2026 = 15th February 2026
- 01-12-2026 = 1st December 2026
- 25-03-2026 = 25th March 2026

### American Format (MM-DD-YYYY)
✗ **NOT supported**
- 02-15-2026 would be interpreted as 2nd day of 15th month (invalid)
- Use 15-02-2026 instead

### ISO Format (YYYY-MM-DD)
✗ **NOT supported**
- 2026-02-15 is not recognized
- Use 15-02-2026 instead

## Valid Examples

| Input | Interpreted As | Display Format |
|-------|----------------|----------------|
| `15-02-2026 20:00` | 15 Feb 2026, 8:00 PM | 15-02-2026 8:00 PM |
| `15-02-2026 08:00 PM` | 15 Feb 2026, 8:00 PM | 15-02-2026 8:00 PM |
| `01-01-2026 00:00` | 1 Jan 2026, Midnight | 01-01-2026 12:00 AM |
| `31-12-2026 23:59` | 31 Dec 2026, 11:59 PM | 31-12-2026 11:59 PM |
| `15-02-2026 12:00 PM` | 15 Feb 2026, Noon | 15-02-2026 12:00 PM |

## Invalid Examples

| Input | Problem | Should Be |
|-------|---------|-----------|
| `2026-02-15 20:00` | Wrong order (YYYY-MM-DD) | `15-02-2026 20:00` |
| `02-15-2026 20:00` | American format (MM-DD-YYYY) | `15-02-2026 20:00` |
| `15/02/2026 20:00` | Wrong separator (/) | `15-02-2026 20:00` |
| `15-2-2026 20:00` | Month not zero-padded | `15-02-2026 20:00` |
| `15-02-26 20:00` | Year only 2 digits | `15-02-2026 20:00` |
| `15-02-2026 8:00` | Hour not zero-padded | `15-02-2026 08:00` |
| `15-02-2026 20` | Missing minutes | `15-02-2026 20:00` |
| `15-02-2026 8PM` | Missing colon/space | `15-02-2026 08:00 PM` |

## Time Conversion Reference

### 24-Hour to 12-Hour

| 24-Hour | 12-Hour |
|---------|---------|
| 00:00 | 12:00 AM (Midnight) |
| 01:00 | 1:00 AM |
| 06:00 | 6:00 AM |
| 12:00 | 12:00 PM (Noon) |
| 13:00 | 1:00 PM |
| 18:00 | 6:00 PM |
| 20:00 | 8:00 PM |
| 23:59 | 11:59 PM |

## How the Bot Displays Dates

When you create an event, the bot displays the date/time in **12-hour format with AM/PM**:

**You input:**
```
!preset overwatch 15-02-2026 20:00
```

**Bot displays:**
```
📅 Date & Time: 15-02-2026 8:00 PM
```

## Tips for Success

### ✅ DO:

- Use dashes (-) as separators: `15-02-2026`
- Zero-pad single digits: `01-03-2026` not `1-3-2026`
- Use 24-hour format for simplicity: `20:00` instead of `08:00 PM`
- Include minutes: `20:00` not `20`
- Double-check month and day order: Day first, month second

### ❌ DON'T:

- Use slashes: `15/02/2026` ✗
- Use American format: `02-15-2026` ✗
- Use ISO format: `2026-02-15` ✗
- Forget zero-padding: `15-2-2026` ✗
- Omit the year: `15-02 20:00` ✗
- Use 2-digit years: `15-02-26` ✗

## Quick Reference Card

```
┌─────────────────────────────────────────┐
│     DATE & TIME FORMAT QUICK REF        │
├─────────────────────────────────────────┤
│ Format: DD-MM-YYYY HH:MM [AM/PM]        │
│                                         │
│ Examples:                               │
│   15-02-2026 20:00        ✓             │
│   15-02-2026 08:00 PM     ✓             │
│   01-12-2026 14:30        ✓             │
│                                         │
│ Common Mistakes:                        │
│   2026-02-15 20:00        ✗ Wrong order │
│   02-15-2026 20:00        ✗ USA format  │
│   15/02/2026 20:00        ✗ Wrong sep   │
│   15-2-2026 20:00         ✗ No padding  │
└─────────────────────────────────────────┘
```

## Troubleshooting

### Error: "Invalid date format"

**Cause:** Date doesn't match DD-MM-YYYY HH:MM format

**Solutions:**
1. Check you're using DD-MM-YYYY (not MM-DD-YYYY or YYYY-MM-DD)
2. Ensure you're using dashes (-) not slashes (/)
3. Verify all numbers are zero-padded (01, not 1)
4. Make sure you included the time (HH:MM)
5. Check spacing: one space between date and time

**Example of correct format:**
```
✓ 15-02-2026 20:00
✓ 15-02-2026 08:00 PM
```

### Event shows wrong time

**Check:**
1. Did you use 24-hour or 12-hour format correctly?
2. If using AM/PM, is it spelled correctly?
3. Remember: 12:00 AM = midnight, 12:00 PM = noon

**Conversions:**
- 8:00 PM = 20:00
- 8:00 AM = 08:00
- Midnight = 00:00 or 12:00 AM
- Noon = 12:00 or 12:00 PM

## Regional Notes

This bot uses **British/European date format** (DD-MM-YYYY) which is standard in:
- 🇬🇧 United Kingdom
- 🇪🇺 Most of Europe
- 🇦🇺 Australia
- 🇮🇳 India
- And many other countries

If you're used to American format (MM-DD-YYYY), remember to **swap the day and month**:
- American: February 15th, 2026 → 02-15-2026
- This bot: February 15th, 2026 → **15-02-2026**

## Examples by Use Case

### Gaming Sessions

```
!preset overwatch 15-02-2026 20:00
!preset valorant 15-02-2026 07:00 PM
!preset csgo 20-02-2026 21:30
```

### Weekend Events

```
!preset helldivers 22-02-2026 10:00 AM
!preset minecraft 22-02-2026 14:00
!preset among-us 22-02-2026 08:00 PM
```

### Late Night Gaming

```
!preset rust 15-02-2026 23:00
!preset tarkov 15-02-2026 11:30 PM
```

### Early Morning Raids

```
!preset wow-raid 16-02-2026 06:00 AM
!preset ffxiv-raid 16-02-2026 07:00
```

## Summary

**Remember the format:**
```
DD-MM-YYYY HH:MM [AM/PM]
│  │  │    │  │   └─ Optional
│  │  │    │  └───── Minutes (00-59)
│  │  │    └──────── Hours (00-23 or 01-12 + AM/PM)
│  │  └───────────── Year (4 digits)
│  └──────────────── Month (01-12)
└─────────────────── Day (01-31)
```

**Quick test:**
- 15th February 2026 at 8:00 PM = `15-02-2026 20:00` or `15-02-2026 08:00 PM`
- 1st December 2026 at 2:30 PM = `01-12-2026 14:30` or `01-12-2026 02:30 PM`
- 25th March 2026 at midnight = `25-03-2026 00:00` or `25-03-2026 12:00 AM`

When in doubt: **Day-Month-Year Hour:Minute** with dashes and zero-padding!
