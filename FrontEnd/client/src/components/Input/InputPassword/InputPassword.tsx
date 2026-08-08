import React from "react";
import {
  PasswordInput,
  type PasswordInputProps,
} from "@mantine/core";
import type { ReactNode } from "react";
import style from "./InputPassword.module.scss";

interface InputPasswordProps
  extends Omit<PasswordInputProps, "onClick"> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fontWeight?: number;
  fullWidth?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const InputPassword: React.FC<InputPasswordProps> = ({
  leftIcon,
  rightIcon,
  fontWeight,
  fullWidth,
  onClick,
  ...props
}) => {
  return (
    <PasswordInput
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
        innerInput: style.innerInputField,
      }}
      styles={{
        input: {
          fontWeight,
        },
      }}
    />
  );
};

export default InputPassword;