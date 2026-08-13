import { IconCheck } from '@tabler/icons-react';
import classes from './ExamTake.module.scss';
import type { McqOption } from './types';

type Props = {
  options: McqOption[];
  value: string | string[] | null;
  onChange: (value: string | string[]) => void;
  onClear?: () => void;
  multiSelect?: boolean;
};

export function McqOptionList({ options, value, onChange, onClear, multiSelect = false }: Props) {
  const isSelected = (key: string) => {
    if (Array.isArray(value)) return value.includes(key);
    return value === key;
  };

  const handleClick = (key: string) => {
    let next: string | string[];
    
    if (multiSelect) {
      if (Array.isArray(value)) {
        if (value.includes(key)) {
          next = value.filter((k) => k !== key);
        } else {
          next = [...value, key];
        }
      } else if (value) {
        if (value === key) next = [];
        else next = [value, key];
      } else {
        next = [key];
      }
      if (Array.isArray(next)) next.sort();
    } else {
      // Single select (MCQ)
      if (Array.isArray(value)) {
        if (value.includes(key)) next = [];
        else next = [key];
      } else if (value === key) {
        next = [];
      } else {
        next = [key];
      }
    }
    
    onChange(next);
  };

  return (
    <div>
      {options.map((opt) => {
        const selected = isSelected(opt.key);
        return (
          <button
            key={opt.key}
            type="button"
            className={`${classes.mcqOption} ${selected ? classes.mcqOptionSelected : ''}`}
            style={{ marginBottom: 10 }}
            onClick={() => handleClick(opt.key)}
          >
            <span className={`${classes.mcqKey} ${selected ? classes.mcqKeySelected : ''}`}>
              {opt.key}
            </span>
            <span className={classes.mcqLabel}>{opt.label}</span>
            {selected && <IconCheck size={22} color="var(--mantine-color-primary-6)" />}
          </button>
        );
      })}
      {onClear && (Array.isArray(value) ? value.length > 0 : Boolean(value)) && (
        <div style={{ textAlign: 'right', marginTop: 4 }}>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              color: 'var(--mantine-color-dimmed)',
              textDecoration: 'underline',
            }}
            onClick={onClear}
          >
            Xóa lựa chọn
          </button>
        </div>
      )}
    </div>
  );
}
