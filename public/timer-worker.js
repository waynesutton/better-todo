// Web Worker for Pomodoro timer background execution
let timerId = null;
let remainingTime = 0;
let isRunning = false;

self.addEventListener("message", (e) => {
  const { type, time } = e.data;

  switch (type) {
    case "start":
      remainingTime = time;
      isRunning = true;
      startTimer();
      break;

    case "pause":
      isRunning = false;
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      break;

    case "resume":
      isRunning = true;
      startTimer();
      break;

    case "stop":
      isRunning = false;
      remainingTime = 0;
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      break;

    default:
      break;
  }
});

function startTimer() {
  if (timerId) {
    clearInterval(timerId);
  }

  timerId = setInterval(() => {
    if (!isRunning) {
      clearInterval(timerId);
      timerId = null;
      return;
    }

    remainingTime -= 1000; // Decrease by 1 second

    if (remainingTime <= 0) {
      remainingTime = 0;
      isRunning = false;
      clearInterval(timerId);
      timerId = null;
      self.postMessage({ type: "complete" });
    } else {
      self.postMessage({ type: "tick", time: remainingTime });
    }
  }, 1000);
}
