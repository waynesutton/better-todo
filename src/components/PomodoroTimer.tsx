import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  StopwatchIcon,
  PlayIcon,
  PauseIcon,
  ResetIcon,
  Cross2Icon,
  ExitFullScreenIcon,
  EnterFullScreenIcon,
} from "@radix-ui/react-icons";

export function PomodoroTimer() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [displayTime, setDisplayTime] = useState(25 * 60 * 1000); // 25 minutes in ms
  const workerRef = useRef<Worker | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Fetch current session from Convex
  const session = useQuery(api.pomodoro.getPomodoroSession);

  // Mutations
  const startPomodoro = useMutation(api.pomodoro.startPomodoro);
  const pausePomodoro = useMutation(api.pomodoro.pausePomodoro);
  const resumePomodoro = useMutation(api.pomodoro.resumePomodoro);
  const stopPomodoro = useMutation(api.pomodoro.stopPomodoro);
  const completePomodoro = useMutation(api.pomodoro.completePomodoro);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker("/timer-worker.js");

    workerRef.current.onmessage = (e) => {
      const { type, time } = e.data;

      if (type === "tick") {
        setDisplayTime(time);
      } else if (type === "complete") {
        setDisplayTime(0);
        playNotificationSound();
        setIsFullScreen(true);
        if (session) {
          completePomodoro({ sessionId: session._id });
        }
      }
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [session, completePomodoro]);

  // Sync with Convex session
  useEffect(() => {
    if (!session) {
      setDisplayTime(25 * 60 * 1000);
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "stop" });
      }
      return;
    }

    setDisplayTime(session.remainingTime);

    if (session.status === "running") {
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: "start",
          time: session.remainingTime,
        });
      }
    } else if (session.status === "paused") {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "pause" });
      }
    } else if (session.status === "completed") {
      setIsFullScreen(true);
      setDisplayTime(0);
    }
  }, [session]);

  // Play notification sound using Web Audio API
  const playNotificationSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);

    // Play a second beep
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.frequency.value = 800;
      osc2.type = "sine";

      gain2.gain.setValueAtTime(0.3, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.5);
    }, 200);
  };

  // Format time as MM:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleStart = async () => {
    await startPomodoro();
  };

  const handlePause = async () => {
    if (session && workerRef.current) {
      await pausePomodoro({
        sessionId: session._id,
        remainingTime: displayTime,
      });
    }
  };

  const handleResume = async () => {
    if (session) {
      await resumePomodoro({ sessionId: session._id });
    }
  };

  const handleStop = async () => {
    if (session) {
      await stopPomodoro({ sessionId: session._id });
      setIsModalOpen(false);
      setIsFullScreen(false);
    }
  };

  const handleReset = async () => {
    if (session) {
      await stopPomodoro({ sessionId: session._id });
    }
    await startPomodoro();
    setIsFullScreen(false);
  };

  const handleCloseFullScreen = async () => {
    setIsFullScreen(false);
    if (session) {
      await stopPomodoro({ sessionId: session._id });
    }
  };

  const handleMinimizeFullScreen = () => {
    setIsFullScreen(false);
    setIsModalOpen(true);
  };

  const handleEnterFullScreen = () => {
    setIsModalOpen(false);
    setIsFullScreen(true);
  };

  const handleClickTimer = () => {
    if (session?.status === "running" || session?.status === "paused") {
      setIsModalOpen(true);
    } else {
      handleStart();
    }
  };

  const isRunning = session?.status === "running";
  const isPaused = session?.status === "paused";

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Escape") {
        if (isFullScreen) {
          // Just close full-screen without stopping timer
          setIsFullScreen(false);
        } else if (isModalOpen) {
          setIsModalOpen(false);
        }
      }

      // Press 'f' to enter full screen when modal is open
      if (e.key === "f" && isModalOpen && !isFullScreen) {
        e.preventDefault();
        handleEnterFullScreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen, isModalOpen]);

  return (
    <>
      {/* Timer button in header */}
      <button
        className="search-button pomodoro-button"
        onClick={handleClickTimer}
        title={isRunning ? "Pomodoro running" : "Start Pomodoro"}
      >
        {isRunning || isPaused ? (
          <span className="pomodoro-countdown">{formatTime(displayTime)}</span>
        ) : (
          <StopwatchIcon style={{ width: 18, height: 18 }} />
        )}
      </button>

      {/* Control Modal */}
      {isModalOpen && !isFullScreen && (
        <div className="search-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="pomodoro-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="pomodoro-modal-close"
              onClick={() => setIsModalOpen(false)}
              title="Close"
            >
              <Cross2Icon />
            </button>

            <div className="pomodoro-timer-display">
              {formatTime(displayTime)}
            </div>

            <div className="pomodoro-controls">
              {!isRunning && !isPaused && (
                <button
                  className="pomodoro-control-button"
                  onClick={handleStart}
                  title="Start"
                >
                  <PlayIcon width={24} height={24} />
                </button>
              )}

              {isRunning && (
                <button
                  className="pomodoro-control-button"
                  onClick={handlePause}
                  title="Pause"
                >
                  <PauseIcon width={24} height={24} />
                </button>
              )}

              {isPaused && (
                <button
                  className="pomodoro-control-button"
                  onClick={handleResume}
                  title="Resume"
                >
                  <PlayIcon width={24} height={24} />
                </button>
              )}

              {(isRunning || isPaused) && (
                <>
                  <button
                    className="pomodoro-control-button"
                    onClick={handleReset}
                    title="Reset"
                  >
                    <ResetIcon width={24} height={24} />
                  </button>
                  <button
                    className="pomodoro-control-button"
                    onClick={handleEnterFullScreen}
                    title="Enter Full Screen"
                  >
                    <EnterFullScreenIcon width={24} height={24} />
                  </button>
                  <button
                    className="pomodoro-control-button danger"
                    onClick={handleStop}
                    title="Stop"
                  >
                    <Cross2Icon width={24} height={24} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen completion modal - rendered in portal */}
      {isFullScreen &&
        createPortal(
          <div className="pomodoro-fullscreen">
            <div className="pomodoro-fullscreen-content">
              <div className="pomodoro-fullscreen-message">keep cooking!</div>

              <div className="pomodoro-timer-display-large">
                {formatTime(displayTime)}
              </div>

              <div className="pomodoro-controls-large">
                <button
                  className="pomodoro-control-button-large"
                  onClick={handleReset}
                  title="Restart"
                >
                  <ResetIcon width={32} height={32} />
                </button>

                <button
                  className="pomodoro-control-button-large"
                  onClick={handleMinimizeFullScreen}
                  title="Minimize"
                >
                  <ExitFullScreenIcon width={32} height={32} />
                </button>

                <button
                  className="pomodoro-control-button-large danger"
                  onClick={handleCloseFullScreen}
                  title="Close"
                >
                  <Cross2Icon width={32} height={32} />
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
