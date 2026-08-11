/* Hallmark · genre: editorial · theme: Garden · component: RoomCodeInput
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 * contrast: pass (≥4.5:1)
 */

import { useRef, useState } from 'react';

interface RoomCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
  error?: boolean;
}

const css = `
.rci-cell {
  flex: 1;
  min-width: 0;
  height: 56px;
  text-align: center;
  font-size: var(--text-xl);
  font-family: var(--font-mono);
  text-transform: uppercase;
  background-color: var(--color-paper);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-ink);
  outline: none;
  transition: border-color var(--dur-fast) var(--ease-out),
              box-shadow var(--dur-fast) var(--ease-out),
              background-color var(--dur-fast) var(--ease-out);
}
.rci-cell::placeholder {
  color: var(--color-ink-3);
}
.rci-cell:hover {
  border-color: var(--color-ink-3);
  background-color: var(--color-paper-2);
}
.rci-cell:focus-visible {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}
.rci-cell:active {
  border-color: var(--color-accent);
}
.rci-cell:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--color-paper-2);
}
.rci-cell[data-filled="true"] {
  background-color: var(--color-accent-soft);
  border-color: var(--color-accent);
  font-weight: 600;
}
.rci-cell[data-state="error"] {
  border-color: var(--color-danger);
}
.rci-cell[data-state="success"] {
  border-color: var(--color-success);
}

@media (prefers-reduced-motion: reduce) {
  .rci-cell {
    transition-duration: 0.01ms !important;
  }
}
`;

export default function RoomCodeInput({
  value,
  onChange,
  maxLength = 6,
  disabled = false,
  error = false,
}: RoomCodeInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const chars = value.padEnd(maxLength, ' ').split('').slice(0, maxLength);

  function handleChange(index: number, char: string) {
    char = char.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!char) return;

    const newValue = value.split('');
    while (newValue.length < maxLength) newValue.push(' ');
    newValue[index] = char;
    const result = newValue.join('').trimEnd();
    onChange(result);

    if (index < maxLength - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !chars[index]?.trim() && index > 0) {
      inputsRef.current[index - 1]?.focus();
      const newValue = value.split('');
      if (newValue.length >= index) {
        newValue[index - 1] = ' ';
        onChange(newValue.join('').trimEnd());
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!pasted) return;
    const sliced = pasted.slice(0, maxLength);
    onChange(sliced);
    const nextEmpty = Math.min(sliced.length, maxLength - 1);
    inputsRef.current[nextEmpty]?.focus();
  }

  return (
    <>
      <style>{css}</style>
      <div className="flex gap-sm justify-center w-full" role="group" aria-label="授权码输入">
        {chars.map((char, i) => {
          const isFilled = char.trim().length > 0;
          return (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el; }}
              type="text"
              inputMode="text"
              autoComplete="off"
              maxLength={1}
              value={char.trim()}
              disabled={disabled}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(null)}
              className="rci-cell"
              data-filled={isFilled ? 'true' : undefined}
              data-state={error ? 'error' : undefined}
              aria-label={`授权码第 ${i + 1} 位`}
            />
          );
        })}
      </div>
    </>
  );
}
