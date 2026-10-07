export type HelperProjectionParams = {
  timer: number;

  helperTimer?: number;
  helperCooldown?: number;

  helperLevel: number;

  helperRecurrent?: boolean;
};

const HELPER_WORK_DURATION = 3600; // 1 hour
const DAILY_INTERVAL = 86400; // 24 hours

export function projectHelperTimer({
  timer,
  helperTimer = 0,
  helperCooldown = 0,
  helperLevel,
  helperRecurrent = false,
}: HelperProjectionParams): number {

  let savedSeconds = 0;

  // Current active session
  if (helperTimer > 0) {
    savedSeconds += helperTimer * helperLevel;
  }

  if (!helperRecurrent) {
    return Math.max(
      0,
      timer - savedSeconds
    );
  }

  let activationTime = helperCooldown;

  while (activationTime < (timer - savedSeconds)) {

    savedSeconds +=
      HELPER_WORK_DURATION * helperLevel;

    activationTime += DAILY_INTERVAL;
  }

  return Math.max(
    0,
    timer - savedSeconds
  );
}