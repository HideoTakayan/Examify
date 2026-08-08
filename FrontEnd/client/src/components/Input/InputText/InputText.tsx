import React from "react";
import {
  TextInput,
  type TextInputProps,
} from "@mantine/core";
import type { ReactNode } from "react";
import style from "./InputText.module.scss";

interface InputTextProps
  extends Omit<TextInputProps, "onClick"> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fontWeight?: number;
  fullWidth?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const InputText: React.FC<InputTextProps> = ({
  leftIcon,
  rightIcon,
  fontWeight,
  fullWidth,
  onClick,
  ...props
}) => {
  return (
    <TextInput
      radius="md"
      leftSection={leftIcon}
      rightSection={rightIcon}
      w={fullWidth ? "100%" : undefined}
      onClick={onClick}
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

export default InputText;