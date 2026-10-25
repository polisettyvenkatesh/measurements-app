export interface PasswordStrength {
  valid: boolean;
  message: string;
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

export function passwordStrength(pw: string): PasswordStrength {
  if (!pw) return { valid: false, message: '', score: 0, label: '', color: 'bg-slate-200' };

  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-zA-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;

  const meetsMinimum = pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);

  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600'];

  if (!meetsMinimum) {
    return {
      valid: false,
      message: 'Use at least 8 characters with both letters and numbers',
      score: 1,
      label: labels[1],
      color: colors[1],
    };
  }

  return {
    valid: true,
    message: '',
    score: score as 0 | 1 | 2 | 3 | 4,
    label: labels[score],
    color: colors[score],
  };
}