export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

export function demoId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function demoTimestamp() {
  return new Date().toISOString();
}
