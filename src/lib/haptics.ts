// Haptic feedback utility for iOS native feel

/**
 * Trigger haptic feedback on supported devices
 * @param type - The type of haptic feedback ("light", "medium", "heavy")
 */
export const triggerHaptic = (type: "light" | "medium" | "heavy" = "light") => {
  // Check if the Vibration API is available
  if (!navigator.vibrate) {
    return;
  }

  // Map haptic types to vibration patterns
  const patterns = {
    light: 10,
    medium: 20,
    heavy: 30,
  };

  navigator.vibrate(patterns[type]);
};

/**
 * Trigger a success haptic pattern
 */
export const triggerSuccessHaptic = () => {
  if (navigator.vibrate) {
    navigator.vibrate([10, 50, 10]);
  }
};

/**
 * Trigger an error haptic pattern
 */
export const triggerErrorHaptic = () => {
  if (navigator.vibrate) {
    navigator.vibrate([20, 100, 20]);
  }
};

/**
 * Trigger a selection haptic (for checkbox, toggle, etc.)
 */
export const triggerSelectionHaptic = () => {
  if (navigator.vibrate) {
    navigator.vibrate(5);
  }
};
