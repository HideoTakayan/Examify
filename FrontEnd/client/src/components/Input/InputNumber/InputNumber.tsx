import React from "react";
import {
  NumberInput,
  type NumberInputProps,
} from "@mantine/core";
import type { ReactNode } from "react";
import style from "./InputNumber.module.scss";

interface InputNumberProps
  extends Omit<NumberInputProps, "onClick"> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fontWeight?: number;
  fullWidth?: boolean;
  onClick?: React.MouseEventHandler<HTMLInputElement>;
}

const InputNumber: React.FC<InputNumberProps> = ({
  leftIcon,
  rightIcon,
  fontWeight,
  fullWidth,
  onClick,
  ...props
}) => {
  return (
    <NumberInput
      radius={'md'}
      leftSection={leftIcon}
      rightSection={rightIcon}
      w={fullWidth ? "100%" : undefined}
      onClick={onClick}
      hideControls 
      {...props}
      classNames={{
        root: style.rootInput,
        input: style.inputField,
        section: style.sectionField,
      }}
      styles={{
        input: {
          fontWeight,
        },
      }}
    />
  );
};

export default InputNumber;
