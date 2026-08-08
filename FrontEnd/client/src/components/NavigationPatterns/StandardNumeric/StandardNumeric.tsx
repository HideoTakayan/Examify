import { useState } from "react";
import { Pagination } from "@mantine/core";
import style from "./StandardNumeric.module.scss";

interface StandardNumericProps {
  total?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
}

export default function StandardNumeric({
  total = 9,
  value,
  defaultValue = 2,
  onChange,
}: StandardNumericProps) {
  const isControlled = value !== undefined; 
  const [internalValue, setInternalValue] = useState(defaultValue);

  const currentValue = isControlled ? (value as number) : internalValue;

  const handleChange = (next: number) => {
    if (!isControlled) {
      setInternalValue(next);
    }
    onChange?.(next);
  };

  return (
    <div className={style.root}>
      <Pagination total={total} value={currentValue} onChange={handleChange} withControls radius="xl" />
    </div>
  );
}
