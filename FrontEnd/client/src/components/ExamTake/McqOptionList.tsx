import { IconCheck } from '@tabler/icons-react';
import classes from './ExamTake.module.scss';
import type { McqOption } from './types';

type Props = {
  options: McqOption[];
  value: string | null;
  onChange: (key: string) => void;
  onClear?: () => void;
};

export function McqOptionList({ options, value, onChange, onClear }: Props) {
  return (
    <div>
      {options.map((opt) => {
        const selected = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            className={`${classes.mcqOption} ${selected ? classes.mcqOptionSelected : ''}`}
            style={{ marginBottom: 10 }}
            onClick={() => onChange(opt.key)}
          >
            <span className={`${classes.mcqKey} ${selected ? classes.mcqKeySelected : ''}`}>
              {opt.key}
            </span>
            <span className={classes.mcqLabel}>{opt.label}</span>
            {selected && <IconCheck size={22} color="var(--mantine-color-primary-6)" />}
          </button>
        );
      })}
      {onClear && value && (
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
