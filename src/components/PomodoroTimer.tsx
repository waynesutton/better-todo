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
import { Volume2, VolumeOff, Waves, Clock, Activity } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

//
interface PomodoroTimerProps {
  triggerData?: { todoId?: string; todoTitle?: string } | null;
  openOnTrigger?: boolean; // new optional prop
  onClearTrigger?: () => void;
}

export function PomodoroTimer({
  triggerData,
  openOnTrigger,
  onClearTrigger,
}: PomodoroTimerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [displayTime, setDisplayTime] = useState(25 * 60 * 1000); // 25 minutes in ms
  const [showBackgroundImage, setShowBackgroundImage] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(25); // 25 or 90 minutes

  // Goal 2
  // adjusting the phase i.e focus and break
  const [currentPhase, setCurrentPhase] = useState<"focus" | "break">("focus");

  const workerRef = useRef<Worker | null>(null);
  const hasPlayedStartSound = useRef(false);
  const hasPlayedCountdownSound = useRef(false);
  const lastEndSoundIndex = useRef(0);
  const hasCalledComplete = useRef(false);
  const hasFetchedImage = useRef(false);
  const activeAudioRef = useRef<HTMLAudioElement[]>([]);
  const userStartedInThisSession = useRef(false);

  // for respective task when start pomodoro click then only modal appear
  useEffect(() => {
    if (openOnTrigger && triggerData) {
      setIsModalOpen(true);
    }
  }, [triggerData, openOnTrigger]);

  // Fetch current session from Convex
  const session = useQuery(api.pomodoro.getPomodoroSession);

  const todoTitle = session?.todoTitle || null;

  // Mutations and Actions
  const advancePomodoroPhase = useMutation(api.pomodoro.advancePomodoroPhase);
  const startPomodoro = useMutation(api.pomodoro.startPomodoro);
  const pausePomodoro = useMutation(api.pomodoro.pausePomodoro);
  const resumePomodoro = useMutation(api.pomodoro.resumePomodoro);
  const stopPomodoro = useMutation(api.pomodoro.stopPomodoro);
  const completePomodoro = useMutation(api.pomodoro.completePomodoro);
  const updatePomodoroPreset = useMutation(api.pomodoro.updatePomodoroPreset);
  const fetchBackgroundImage = useAction(api.unsplash.fetchBackgroundImage);

  // Refs to store latest values for use in Worker callback (avoids recreating Worker)
  const sessionRef = useRef(session);
  const advancePomodoroPhaseRef = useRef(advancePomodoroPhase);
  const completePomodoroRef = useRef(completePomodoro);

  // Keep refs updated with latest values
  useEffect(() => {
    sessionRef.current = session;
    advancePomodoroPhaseRef.current = advancePomodoroPhase;
    completePomodoroRef.current = completePomodoro;
  }, [session, advancePomodoroPhase, completePomodoro]);

  // Initialize Web Worker - only once on mount
  useEffect(() => {
    workerRef.current = new Worker("/timer-worker.js");

    workerRef.current.onmessage = (e) => {
      const { type, time } = e.data;

      if (type === "tick") {
        setDisplayTime(time);

        // Play 5-second countdown sound only if user started in this session
        if (
          time <= 5000 &&
          time > 4000 &&
          !hasPlayedCountdownSound.current &&
          userStartedInThisSession.current
        ) {
          playCountdownSound();
          hasPlayedCountdownSound.current = true;
        }
      } else if (type === "complete") {
        setDisplayTime(0);
        // Only play completion sound if user started in this session
        if (userStartedInThisSession.current) {
          playCompletionSound();
        }
        setIsFullScreen(true);

        // Goal 2
        // Handle phase transition when timer segment completes
        // Use refs to get latest values without recreating Worker
        (async () => {
          const currentSession = sessionRef.current;
          if (!currentSession || hasCalledComplete.current) return;

          if (currentSession.phase === "focus") {
            await advancePomodoroPhaseRef.current({ sessionId: currentSession._id });
            return;
          }

          const nextCycle = (currentSession.cycleIndex ?? 0) + 1;
          const totalCycles = currentSession.totalCycles ?? 1;
          if (nextCycle >= totalCycles) {
            hasCalledComplete.current = true;
            await completePomodoroRef.current({ sessionId: currentSession._id });
          } else {
            await advancePomodoroPhaseRef.current({ sessionId: currentSession._id });
          }
        })().catch(console.error);
      }
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      // Clean up all audio elements on unmount
      activeAudioRef.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      activeAudioRef.current = [];
    };
  }, []); // Empty deps - Worker created only once

  // Sync with Convex session
  useEffect(() => {
    if (!session) {
      setDisplayTime(durationMinutes * 60 * 1000);
      hasPlayedStartSound.current = false;
      hasPlayedCountdownSound.current = false;
      hasCalledComplete.current = false;
      hasFetchedImage.current = false;
      userStartedInThisSession.current = false;
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "stop" });
      }
      setCurrentPhase("focus");
      return;
    }

    setDisplayTime(session.remainingTime);
    // Goal 2: When session exists then..
    setCurrentPhase(session.phase ?? "focus");

    if (session.status === "running") {
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: "start",
          time: session.remainingTime,
        });
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
      // Goal 2: Stop worker when session completes
      workerRef.current?.postMessage({ type: "stop" });

      setIsFullScreen(true);
      setDisplayTime(0);
    }
  }, [session, fetchBackgroundImage, durationMinutes]);

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

  // Helper to play audio with proper cleanup on success, failure, or error
  const playAudio = (src: string) => {
    if (isMuted) return;
    const audio = new Audio(src);
    audio.volume = 0.7;
    activeAudioRef.current.push(audio);

    const removeFromRef = () => {
      activeAudioRef.current = activeAudioRef.current.filter((a) => a !== audio);
      audio.src = ""; // Release the audio resource
    };

    audio.onended = removeFromRef;
    audio.onerror = removeFromRef;

    audio.play().catch((err) => {
      console.error("Audio play failed:", err);
      removeFromRef(); // Clean up on play failure (e.g., autoplay blocked)
    });
  };

  // Play start sound
  const playStartSound = () => playAudio("/timer-start.mp3");

  // Play 5-second countdown sound
  const playCountdownSound = () => playAudio("/5-second-coutdown.mp3");

  // Play pause sound
  const playPauseSound = () => playAudio("/pause.mp3");

  // Play completion sound (rotates through list)
  const playCompletionSound = () => {
    const soundUrl = endSounds[lastEndSoundIndex.current];
    playAudio(soundUrl);
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

  // GOAL 2 : session presets for focus , break cycles
  const sessionPresets: Record<
    number,
    { focus: number; break: number; cycles: number }
  > = {
    25: { focus: 25, break: 5, cycles: 4 },
    50: { focus: 50, break: 10, cycles: 2 },
    90: { focus: 90, break: 30, cycles: 1 },
  };

  // New : Goal 2 - pull out preset based on duration minutes
  const activePreset = sessionPresets[durationMinutes] ?? sessionPresets[25];

  const handleStart = async () => {
    hasPlayedStartSound.current = false;
    hasPlayedCountdownSound.current = false;
    hasCalledComplete.current = false;
    userStartedInThisSession.current = true;

    // goal 2 : focus and break ms
    const focusMs = activePreset.focus * 60 * 1000;
    const breakMs = activePreset.break * 60 * 1000;

    await startPomodoro({
      durationMinutes,
      todoId: (triggerData?.todoId as Id<"todos">) ?? null, //Goal 1 ✅ Type cast fix
      todoTitle: triggerData?.todoTitle ?? null,
      totalCycles: activePreset.cycles,
      phaseDuration: focusMs,
      breakDuration: breakMs,
    });
    onClearTrigger?.();
    // Play start sound only if not muted
    if (!isMuted) {
      playStartSound();
    }
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
    }

    // ✅ Immediately reset local UI
    setIsModalOpen(false);
    setIsFullScreen(false);
    setDisplayTime(durationMinutes * 60 * 1000);
  };

  const handleReset = async () => {
    if (session) {
      await stopPomodoro({ sessionId: session._id });
    }
    hasPlayedStartSound.current = false;
    hasPlayedCountdownSound.current = false;
    hasCalledComplete.current = false;
    userStartedInThisSession.current = true;

    // goal 2 : focus and break ms
    const focusMs = activePreset.focus * 60 * 1000;
    const breakMs = activePreset.break * 60 * 1000;

    await startPomodoro({
      durationMinutes,
      todoId: triggerData?.todoId as Id<"todos">, // ✅ Type cast fix
      todoTitle: triggerData?.todoTitle,
      totalCycles: activePreset.cycles,
      phaseDuration: focusMs,
      breakDuration: breakMs,
    });
    // Play start sound only if not muted
    if (!isMuted) {
      playStartSound();
    }
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

  // 🆕 New: Presets and icons for the pomodoro timer
  const durationPresets = [25, 50, 90];
  const durationIcons: Record<number, JSX.Element> = {
    25: <Waves width={24} height={24} />,
    50: <Activity width={24} height={24} />,
    90: <Clock width={24} height={24} />,
  };
  const durationLabels: Record<number, string> = {
    25: "25 min focus",
    50: "50 min steady session",
    90: "90 min flow state",
  };

  const handleToggleDuration = () => {
    // (This assumes durationMinutes is always one of those values; if not, default currentIndex to 0.)

    const currentIndex = durationPresets.indexOf(durationMinutes);
    //Wayne code:  const newDuration = durationMinutes === 25 ? 90 : 25;
    const nextIndex = (currentIndex + 1) % durationPresets.length;
    const newDuration = durationPresets[nextIndex];

    setDurationMinutes(newDuration);
    setDisplayTime(newDuration * 60 * 1000);
  };

  // Handler for changing duration while paused (modal and full-screen)
  const handleChangeDurationWhilePaused = async () => {
    if (!session) return;

    const currentIndex = durationPresets.indexOf(durationMinutes);
    const nextIndex = (currentIndex + 1) % durationPresets.length;
    const newDuration = durationPresets[nextIndex];

    // Get the preset for the new duration
    const preset = sessionPresets[newDuration] ?? sessionPresets[25];
    const focusMs = preset.focus * 60 * 1000;
    const breakMs = preset.break * 60 * 1000;

    // Update local state immediately for smooth UI
    setDurationMinutes(newDuration);
    setDisplayTime(focusMs);

    // Reset sound tracking flags
    hasPlayedStartSound.current = false;
    hasPlayedCountdownSound.current = false;
    hasCalledComplete.current = false;

    // Single mutation to update preset in place - no flickering
    await updatePomodoroPreset({
      sessionId: session._id,
      durationMinutes: newDuration,
      totalCycles: preset.cycles,
      phaseDuration: focusMs,
      breakDuration: breakMs,
    });
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
          {/* added css with existing pomodoro-modal */}
          <div
            className={`pomodoro-modal`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="pomodoro-modal-close"
              onClick={() => setIsModalOpen(false)}
              title="Close"
            >
              <Cross2Icon />
            </button>

            {/* Goal 2 : Adding phase badge in the modal */}
            {session && (
              <div className="phase-badge-wrapper">
                <div className={`phase-badge phase-${currentPhase}`}>
                  {currentPhase === "focus" ? "Focus" : "Break"} · Round{" "}
                  {(session.cycleIndex ?? 0) + 1} of {session.totalCycles ?? 1}
                </div>
              </div>
            )}

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
                <>
                  <button
                    className="pomodoro-control-button"
                    onClick={handleToggleDuration}
                    title={durationLabels[durationMinutes]}
                  >
                     {/* 🧭 Modified: replaced Wayne’s single toggle logic with preset-based duration control (25, 50, 90 mins) */}
                    <span className="duration-icon">
                      {durationIcons[durationMinutes]}
                    </span>
                  </button>
                  <button
                    className="pomodoro-control-button"
                    onClick={handleStart}
                    title="Start"
                  >
                    <PlayIcon width={24} height={24} />
                  </button>
                </>
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
                <>
                  <button
                    className="pomodoro-control-button"
                    onClick={handleChangeDurationWhilePaused}
                    title={durationLabels[durationMinutes]}
                  >
                    <span className="duration-icon">
                      {durationIcons[durationMinutes]}
                    </span>
                  </button>
                  <button
                    className="pomodoro-control-button"
                    onClick={handleResume}
                    title="Resume"
                  >
                    <PlayIcon width={24} height={24} />
                  </button>
                </>
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

            {/* 🆕 New - Goal 2 : Change classname when background image is true i.e from blue or green to white  */}
            <div
              className={`pomodoro-fullscreen-content${showBackgroundImage ? " with-glass-effect" : ""}`}
            >
              {session && (
                <div
                  className={`phase-badge phase-${currentPhase} ${showBackgroundImage ? "phase-invert" : ""}`}
                >
                  {currentPhase === "focus" ? "Focus" : "Break"} · Round{" "}
                  {(session.cycleIndex ?? 0) + 1} of {session.totalCycles ?? 1}
                </div>
              )}
              <div className="pomodoro-fullscreen-message">
                {todoTitle ? `Working on:  ${todoTitle}` : "keep cooking!"}
              </div>

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
                  <>
                    <button
                      className="pomodoro-control-button-large"
                      onClick={handleChangeDurationWhilePaused}
                      title={durationLabels[durationMinutes]}
                    >
                      <span className="duration-icon">
                        {durationIcons[durationMinutes]}
                      </span>
                    </button>
                    <button
                      className="pomodoro-control-button-large"
                      onClick={handleResume}
                      title="Resume"
                    >
                      <PlayIcon width={24} height={24} />
                    </button>
                  </>
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
          document.body
        )}
    </>
  );
}
