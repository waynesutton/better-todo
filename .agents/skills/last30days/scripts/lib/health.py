"""Typed source health: classify a source/tool outcome honestly.

The pipeline historically collapsed every failure into "returned nothing" or a
flat ``errors_by_source`` entry, which hides the difference between a tool that
is *absent*, one that is *present but broken* (the classic stale-venv-shim after
a Python upgrade), one that *timed out*, and one that merely *degraded* (fewer
results than expected). This module gives callers a small typed vocabulary so
warnings can say what actually happened and prescribe the right fix.

It complements ``preflight.py`` (which gates doomed *queries*); this gates
doomed *sources/tools*.
"""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass

# Health states, best to worst.
OK = "ok"
DEGRADED = "degraded"        # ran, but returned less than expected
MISSING = "missing"          # tool/binary/credential absent
BROKEN = "broken"            # present but won't execute (stale shim, bad perms)
TIMEOUT = "timeout"          # exceeded the probe deadline
ERROR = "error"              # ran and failed for another reason


@dataclass
class SourceHealth:
    """Typed outcome for a source or the tool backing it.

    ``state`` is one of the module-level constants. ``reason`` is a short,
    human-readable explanation suitable for a run warning.
    """

    name: str
    state: str
    reason: str = ""

    @property
    def ok(self) -> bool:
        return self.state == OK

    @property
    def usable(self) -> bool:
        """True when the source produced something worth keeping (ok/degraded)."""
        return self.state in (OK, DEGRADED)


def probe_command(
    command: list[str],
    timeout: float = 5.0,
) -> SourceHealth:
    """Probe an external command, distinguishing missing/broken/timeout/ok.

    Separating these is what lets the caller emit a correct repair prescription
    instead of a generic "failed":
      - ``missing``: the executable is not on PATH.
      - ``broken``: on PATH but won't run — FileNotFoundError/OSError on exec, or
        shell exit 126/127 (not-executable / not-found-after-resolution), the
        signature of a stale interpreter shim after an upgrade.
      - ``timeout``: exceeded ``timeout`` seconds.
      - ``ok``: exited 0.
      - ``error``: ran but exited non-zero for another reason.

    The command should be side-effect-free (e.g. ``["gh", "auth", "status"]``);
    callers pass a status/version subcommand, not a mutating one.
    """
    name = command[0] if command else ""
    if not name or shutil.which(name) is None:
        return SourceHealth(name=name, state=MISSING, reason=f"{name or 'command'} not found on PATH")

    try:
        proc = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except (FileNotFoundError, OSError) as exc:
        return SourceHealth(name=name, state=BROKEN, reason=f"{name} present but won't execute: {exc}")
    except subprocess.TimeoutExpired:
        return SourceHealth(name=name, state=TIMEOUT, reason=f"{name} timed out after {timeout:g}s")

    if proc.returncode == 0:
        return SourceHealth(name=name, state=OK)
    if proc.returncode in (126, 127):
        return SourceHealth(name=name, state=BROKEN, reason=f"{name} not executable (exit {proc.returncode})")
    detail = (proc.stderr or proc.stdout or "").strip().splitlines()
    first = detail[0] if detail else f"exit {proc.returncode}"
    return SourceHealth(name=name, state=ERROR, reason=f"{name}: {first}")
