#!/usr/bin/env python3
"""Keep Mochi Sky animation sequencing explicit and consistently formatted."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

ANIMATION_CONFIG = """    const animationFrames = {
      playerIdle: [0, 1],
      playerWalk: [2, 3, 4, 5, 4, 3],
      inhaleStartup: [0, 1, 2, 3, 4],
      inhaleHold: [5, 6, 7, 6]
    };

    function sequenceFrame(sequence, tick) {
      const index = Math.floor(Math.max(0, tick)) % sequence.length;
      return sequence[index];
    }

"""

INHALE_BLOCK = """        const inhaleStep = Math.floor(player.inhaleTick / 4);
        const inhaleFrame = inhaleStep < animationFrames.inhaleStartup.length
          ? animationFrames.inhaleStartup[inhaleStep]
          : sequenceFrame(
              animationFrames.inhaleHold,
              inhaleStep - animationFrames.inhaleStartup.length
            );"""

WALK_BLOCK = """        const frame = !player.onGround
          ? (player.vy < 0 ? 6 : 7)
          : walking
            ? sequenceFrame(animationFrames.playerWalk, player.anim)
            : sequenceFrame(animationFrames.playerIdle, gameTime * 3);"""


def replace_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.MULTILINE)
    if count != 1:
        raise RuntimeError(f"expected one {label} block, found {count}")
    return updated


def main() -> None:
    text = INDEX.read_text(encoding="utf-8")

    if "const animationFrames = {" not in text:
        marker = "    const platforms = ["
        if marker not in text:
            raise RuntimeError("platform marker not found")
        text = text.replace(marker, ANIMATION_CONFIG + marker, 1)

    inhale_pattern = (
        r"[ \t]*const inhaleStep\s*=\s*Math\.floor\(player\.inhaleTick\s*/\s*4\);"
        r"\s*const inhaleFrame\s*=\s*inhaleStep\s*<\s*animationFrames\.inhaleStartup\.length"
        r"\s*\?\s*animationFrames\.inhaleStartup\[inhaleStep\]"
        r"\s*:\s*sequenceFrame\(\s*animationFrames\.inhaleHold,"
        r"\s*inhaleStep\s*-\s*animationFrames\.inhaleStartup\.length\s*\);"
    )
    text = replace_once(text, inhale_pattern, INHALE_BLOCK, "inhale")

    walk_pattern = (
        r"[ \t]*const frame\s*=\s*!player\.onGround"
        r"\s*\?\s*\(player\.vy\s*<\s*0\s*\?\s*6\s*:\s*7\)"
        r"\s*:\s*walking"
        r"\s*\?\s*sequenceFrame\(animationFrames\.playerWalk,\s*player\.anim\)"
        r"\s*:\s*sequenceFrame\(animationFrames\.playerIdle,\s*gameTime\s*\*\s*3\);"
    )
    text = replace_once(text, walk_pattern, WALK_BLOCK, "walking")

    INDEX.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
