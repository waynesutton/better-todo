import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  StopwatchIcon,
  PlayIcon,
  PauseIcon,
  ResetIcon,
  Cross2Icon,
  ExitFullScreenIcon,
  EnterFullScreenIcon,
  ImageIcon,
} from "@radix-ui/react-icons";
import { Volume2, VolumeOff } from "lucide-react";

export function PomodoroTimer() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [displayTime, setDisplayTime] = useState(25 * 60 * 1000); // 25 minutes in ms
  const [showBackgroundImage, setShowBackgroundImage] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const hasPlayedStartSound = useRef(false);
  const hasPlayedCountdownSound = useRef(false);
  const lastEndSoundIndex = useRef(0);
  const hasCalledComplete = useRef(false);
  const hasFetchedImage = useRef(false);
  const activeAudioRef = useRef<HTMLAudioElement[]>([]);

  // Fetch current session from Convex
  const session = useQuery(api.pomodoro.getPomodoroSession);

  // Mutations and Actions
  const startPomodoro = useMutation(api.pomodoro.startPomodoro);
  const pausePomodoro = useMutation(api.pomodoro.pausePomodoro);
  const resumePomodoro = useMutation(api.pomodoro.resumePomodoro);
  const stopPomodoro = useMutation(api.pomodoro.stopPomodoro);
  const completePomodoro = useMutation(api.pomodoro.completePomodoro);
  const fetchBackgroundImage = useAction(api.unsplash.fetchBackgroundImage);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker("/timer-worker.js");

    workerRef.current.onmessage = (e) => {
      const { type, time } = e.data;

      if (type === "tick") {
        setDisplayTime(time);

        // Play 5-second countdown sound when 5 seconds remain
        if (time <= 5000 && time > 4000 && !hasPlayedCountdownSound.current) {
          playCountdownSound();
          hasPlayedCountdownSound.current = true;
        }
      } else if (type === "complete") {
        setDisplayTime(0);
        playCompletionSound();
        setIsFullScreen(true);
        // Only call completePomodoro once per session
        if (session && !hasCalledComplete.current) {
          hasCalledComplete.current = true;
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
      hasPlayedStartSound.current = false;
      hasPlayedCountdownSound.current = false;
      hasCalledComplete.current = false;
      hasFetchedImage.current = false;
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

      // Play start sound only once when timer starts
      if (
        !hasPlayedStartSound.current &&
        session.remainingTime === 25 * 60 * 1000
      ) {
        playStartSound();
        hasPlayedStartSound.current = true;
      }

      // Pre-fetch background image when timer starts
      if (!hasFetchedImage.current) {
        hasFetchedImage.current = true;
        fetchBackgroundImage({ sessionId: session._id });
      }
    } else if (session.status === "paused") {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "pause" });
      }
    } else if (session.status === "completed") {
      setIsFullScreen(true);
      setDisplayTime(0);
    }
  }, [session, fetchBackgroundImage]);

  // List of end sounds to rotate through
  const endSounds = [
    "/end-synth.mp3",
    "/end-epicboom.mp3",
    "/end-epci.mp3",
    "/end-deep.mp3",
    "/end-horns.mp3",
    "/end-computer.mp3",
    "/end-flute.mp3",
    "/pause.mp3",
    "/end-whoa.mp3",
    "/end-waves.mp3",
    "/done.mp3",
  ];

  // Play start sound
  const playStartSound = () => {
    if (isMuted) return;
    const audio = new Audio("/timer-start.mp3");
    audio.volume = 0.7;
    activeAudioRef.current.push(audio);
    audio.play().catch(console.error);
    audio.onended = () => {
      activeAudioRef.current = activeAudioRef.current.filter((a) => a !== audio);
    };
  };

  // Play 5-second countdown sound
  const playCountdownSound = () => {
    if (isMuted) return;
    const audio = new Audio("/5-second-coutdown.mp3");
    audio.volume = 0.7;
    activeAudioRef.current.push(audio);
    audio.play().catch(console.error);
    audio.onended = () => {
      activeAudioRef.current = activeAudioRef.current.filter((a) => a !== audio);
    };
  };

  // Play pause sound
  const playPauseSound = () => {
    if (isMuted) return;
    const audio = new Audio("/pause.mp3");
    audio.volume = 0.7;
    activeAudioRef.current.push(audio);
    audio.play().catch(console.error);
    audio.onended = () => {
      activeAudioRef.current = activeAudioRef.current.filter((a) => a !== audio);
    };
  };

  // Play completion sound (rotates through list)
  const playCompletionSound = () => {
    if (isMuted) return;
    const soundUrl = endSounds[lastEndSoundIndex.current];
    const audio = new Audio(soundUrl);
    audio.volume = 0.7;
    activeAudioRef.current.push(audio);
    audio.play().catch(console.error);
    audio.onended = () => {
      activeAudioRef.current = activeAudioRef.current.filter((a) => a !== audio);
    };

    // Move to next sound in rotation
    lastEndSoundIndex.current =
      (lastEndSoundIndex.current + 1) % endSounds.length;
  };

  // Format time as MM:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleStart = async () => {
    hasPlayedStartSound.current = false;
    hasPlayedCountdownSound.current = false;
    hasCalledComplete.current = false;
    await startPomodoro();
  };

  const handlePause = async () => {
    if (session && workerRef.current) {
      playPauseSound();
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
    hasPlayedStartSound.current = false;
    hasPlayedCountdownSound.current = false;
    hasCalledComplete.current = false;
    await startPomodoro();
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
    // Reset image state to off when entering full-screen
    setShowBackgroundImage(false);
  };

  const handleToggleBackground = () => {
    setShowBackgroundImage(!showBackgroundImage);
  };

  const handleToggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    // Stop all currently playing audio when muting
    if (newMutedState) {
      activeAudioRef.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      activeAudioRef.current = [];
    }
  };

  const handleClickTimer = () => {
    setIsModalOpen(true);
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
              {(isRunning || isPaused) && (
                <button
                  className="pomodoro-control-button"
                  onClick={handleEnterFullScreen}
                  title="Enter Full Screen"
                >
                  <EnterFullScreenIcon width={24} height={24} />
                </button>
              )}

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
                    onClick={handleToggleMute}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <VolumeOff width={24} height={24} />
                    ) : (
                      <Volume2 width={24} height={24} />
                    )}
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
            {showBackgroundImage && session?.backgroundImageUrl && (
              <div className="pomodoro-fullscreen-background">
                <img src={session.backgroundImageUrl} alt="Nature background" />
              </div>
            )}

            <div
              className={`pomodoro-fullscreen-content${showBackgroundImage ? " with-glass-effect" : ""}`}
            >
              <div className="pomodoro-fullscreen-message">keep cooking!</div>

              <div className="pomodoro-timer-display-large">
                {formatTime(displayTime)}
              </div>

              <div className="pomodoro-controls-large">
                <button
                  className="pomodoro-control-button-large"
                  onClick={handleMinimizeFullScreen}
                  title="Minimize"
                >
                  <ExitFullScreenIcon width={24} height={24} />
                </button>

                {session?.backgroundImageUrl && (
                  <button
                    className="pomodoro-control-button-large"
                    onClick={handleToggleBackground}
                    title={
                      showBackgroundImage
                        ? "Hide background"
                        : "Show background"
                    }
                  >
                    <ImageIcon width={24} height={24} />
                  </button>
                )}

                {isRunning && (
                  <button
                    className="pomodoro-control-button-large"
                    onClick={handlePause}
                    title="Pause"
                  >
                    <PauseIcon width={24} height={24} />
                  </button>
                )}

                {isPaused && (
                  <button
                    className="pomodoro-control-button-large"
                    onClick={handleResume}
                    title="Resume"
                  >
                    <PlayIcon width={24} height={24} />
                  </button>
                )}

                <button
                  className="pomodoro-control-button-large"
                  onClick={handleReset}
                  title="Restart"
                >
                  <ResetIcon width={24} height={24} />
                </button>

                <button
                  className="pomodoro-control-button-large"
                  onClick={handleToggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <VolumeOff width={24} height={24} />
                  ) : (
                    <Volume2 width={24} height={24} />
                  )}
                </button>

                <button
                  className="pomodoro-control-button-large danger"
                  onClick={handleCloseFullScreen}
                  title="Close"
                >
                  <Cross2Icon width={24} height={24} />
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
