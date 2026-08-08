import React from "react";
import {
  Textarea,
  type TextareaProps,
} from "@mantine/core";
import style from "./InputTextarea.module.scss";

interface InputTextareaProps
  extends Omit<TextareaProps, "onClick"> {
  fontWeight?: number;
  fullWidth?: boolean;
  onClick?: React.MouseEventHandler<HTMLTextAreaElement>;
}

const InputTextarea: React.FC<InputTextareaProps> = ({
  fontWeight,
  fullWidth,
  onClick,
  ...props
}) => {
  return (
    <Textarea
      radius="md"
      w={fullWidth ? "100%" : undefined}
      onClick={onClick}
      {...props}
      classNames={{
        root: style.rootInput,
        input: style.inputField,
      }}
      styles={{
        input: {
          fontWeight,
        },
      }}
    />
  );
};

export default InputTextarea;