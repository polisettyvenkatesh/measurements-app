import { passwordStrength } from '@/lib/password';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  autoComplete?: string;
  className?: string;
}

export function PasswordField({ value, onChange, placeholder, label, required, autoComplete, className }: Props) {
  const strength = passwordStrength(value);
  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 bg-white';

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {label}{required && ' *'}
        </label>
      )}
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className ?? inputCls}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {value && (
        <div className="mt-1.5">
          <div className="flex gap-1 h-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${i < strength.score ? strength.color : 'bg-slate-200'}`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-[11px] ${strength.valid ? 'text-slate-500' : 'text-amber-600'}`}>
              {strength.valid ? strength.label : strength.message}
            </span>
            {!strength.valid && strength.message && (
              <span className="text-[11px] text-amber-600 font-medium">{strength.label}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}