import React from "react";
import {
  Checkbox,
  type CheckboxProps,
} from "@mantine/core";
import style from "./InputCheckbox.module.scss";

interface InputCheckboxProps
  extends Omit<CheckboxProps, "onClick"> {
  fullWidth?: boolean;
  fontWeight?: number;
}

const InputCheckbox: React.FC<InputCheckboxProps> = ({
  fullWidth,
  fontWeight,
  ...props
}) => {
  return (
    <Checkbox
      {...props}
      w={fullWidth ? "100%" : undefined}
      classNames={{
        root: style.root,
        input: style.input,
        icon: style.icon,
        label: style.label,
      }}
      styles={{
        label: {
          fontWeight,
        },
      }}
    />
  );
};

export default InputCheckbox;