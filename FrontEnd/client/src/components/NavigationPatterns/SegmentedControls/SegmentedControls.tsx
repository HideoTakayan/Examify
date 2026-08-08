import { SegmentedControl } from "@mantine/core";
import { IconLayoutGrid, IconList } from "@tabler/icons-react";
import style from "./SegmentedControls.module.scss";

interface SegmentedControlsProps {
  value?: string;
  onChange?: (value: string) => void;
}

export default function SegmentedControls({ value = "grid", onChange }: SegmentedControlsProps) {
  return (
    <SegmentedControl
      className={style.root}
      value={value}
      onChange={onChange}
      fullWidth
      radius="md"
      data={[
        {
          value: "grid",
          label: (
            <span className={style.optionLabel}><IconLayoutGrid size={14} /> Grid View</span>
          ),
        },
        {
          value: "list",
          label: (
            <span className={style.optionLabel}><IconList size={14} /> List View</span>
          ),
        },
      ]}
    />
  );
}
