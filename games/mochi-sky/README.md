# Mochi Sky / 麻糬星野

A tiny pastel pixel-art side-scroller POC inside **Shem's Tiny Arcade**.

Play it from the arcade:

```text
https://shemyu.github.io/single-page-games/games/mochi-sky/
```

## What is implemented

- horizontal side-scrolling camera
- jump and platform collision
- inhale mechanic
- star projectile attack
- simple enemies
- collectibles
- health UI
- checkpoint
- finish gate
- keyboard controls
- touch controls for mobile browsers
- lightweight procedural audio

## Controls

| Input | Action |
| --- | --- |
| `←` `→` / `A` `D` | Move |
| `Space` / `W` | Jump |
| Hold `X` | Inhale |
| `C` | Shoot star |
| `R` | Restart |
| `P` | Pause |

## POC notes

This is intentionally compact and self-contained: one HTML file with embedded CSS, JavaScript, and canvas rendering. The goal is to validate feel and interaction before extracting assets or introducing a framework.
