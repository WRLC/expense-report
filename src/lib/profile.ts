export type EmployeeProfile = { name: string; email: string };
export const PROFILE_KEY = 'wrlc-expense-report-profile-v1';

export function loadProfile(): EmployeeProfile {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}') as Partial<EmployeeProfile>;
    return { name: typeof parsed.name === 'string' ? parsed.name : '', email: typeof parsed.email === 'string' ? parsed.email : '' };
  } catch { return { name: '', email: '' }; }
}

export function saveProfile(profile: EmployeeProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
