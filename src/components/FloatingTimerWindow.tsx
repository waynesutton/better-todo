import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PictureInPicture } from "@phosphor-icons/react";
import {
  PlayIcon,
  PauseIcon,
  ResetIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { useTheme } from "../context/ThemeContext";
import { useFloatWindow } from "../lib/useFloatWindow";

// Default preset used when starting from the float window (25/5 x4)
const FOCUS_MS = 25 * 60 * 1000;
const BREAK_MS = 5 * 60 * 1000;
const CYCLES = 4;

// Button inside the Pomodoro modal that pops the timer out of the browser
// into a floating on-screen window (Document PiP with popup fallback)
export function FloatingTimerButton() {
  const { theme } = useTheme();
  const { container, isOpen, toggle, setTheme } = useFloatWindow();

  // Keep the float window theme in sync with the app theme
  useEffect(() => {
    if (isOpen) setTheme(theme);
  }, [theme, isOpen, setTheme]);

  return (
    <>
      <button
        className="pomodoro-control-button"
        onClick={() =>
          toggle({
            width: 300,
            height: 260,
            title: "Pomodoro",
            name: "better-todo-float-timer",
            theme,
          })
        }
        title={isOpen ? "Close floating timer" : "Float timer on screen"}
      >
        <PictureInPicture size={24} />
      </button>
      {container && createPortal(<FloatingTimerContent />, container)}
    </>
  );
}

// Format milliseconds as MM:SS
function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Live timer rendered inside the float window. The Convex session is the
// source of truth; while running we tick a local clock against lastUpdated.
// Phase transitions and sounds stay owned by the main window's web worker.
function FloatingTimerContent() {
  const session = useQuery(api.pomodoro.getPomodoroSession);
  const startPomodoro = useMutation(api.pomodoro.startPomodoro);
  const pausePomodoro = useMutation(api.pomodoro.pausePomodoro);
  const resumePomodoro = useMutation(api.pomodoro.resumePomodoro);
  const stopPomodoro = useMutation(api.pomodoro.stopPomodoro);

  const isRunning = session?.status === "running";
  const isPaused = session?.status === "paused";
  const phase = session?.phase ?? "focus";

  // Local clock tick while running so the countdown stays live
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [isRunning]);

  const remaining = !session
    ? FOCUS_MS
    : isRunning
      ? Math.max(
          0,
          session.remainingTime - Math.max(0, now - session.lastUpdated),
        )
      : session.remainingTime;

  const handleStart = async () => {
    await startPomodoro({
      durationMinutes: 25,
      todoId: null,
      todoTitle: null,
      totalCycles: CYCLES,
      phaseDuration: FOCUS_MS,
      breakDuration: BREAK_MS,
    });
  };

  const handlePause = async () => {
    if (!session) return;
    await pausePomodoro({ sessionId: session._id, remainingTime: remaining });
  };

  const handleResume = async () => {
    if (!session) return;
    await resumePomodoro({ sessionId: session._id });
  };

  const handleStop = async () => {
    if (!session) return;
    await stopPomodoro({ sessionId: session._id });
  };

  return (
    <div className="float-timer">
      {session && (
        <div className={`phase-badge phase-${phase}`}>
          {phase === "focus" ? "Focus" : "Break"} · Round{" "}
          {(session.cycleIndex ?? 0) + 1} of {session.totalCycles ?? 1}
        </div>
      )}

      {session?.todoTitle && (
        <div className="float-timer-task" title={session.todoTitle}>
          {session.todoTitle}
        </div>
      )}

      <div className="float-timer-display">{formatTime(remaining)}</div>

      <div className="float-timer-controls">
        {!isRunning && !isPaused && (
          <button
            className="float-timer-button"
            onClick={handleStart}
            title="Start 25 min focus"
          >
            <PlayIcon width={20} height={20} />
          </button>
        )}

        {isRunning && (
          <button
            className="float-timer-button"
            onClick={handlePause}
            title="Pause"
          >
            <PauseIcon width={20} height={20} />
          </button>
        )}

        {isPaused && (
          <button
            className="float-timer-button"
            onClick={handleResume}
            title="Resume"
          >
            <PlayIcon width={20} height={20} />
          </button>
        )}

        {(isRunning || isPaused) && (
          <>
            <button
              className="float-timer-button"
              onClick={handleStart}
              title="Restart"
            >
              <ResetIcon width={20} height={20} />
            </button>
            <button
              className="float-timer-button danger"
              onClick={handleStop}
              title="Stop"
            >
              <Cross2Icon width={20} height={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
