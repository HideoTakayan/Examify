import React from "react";
import {
  Radio,
  type RadioProps,
} from "@mantine/core";
import style from "./InputRadio.module.scss";

interface InputRadioProps extends RadioProps {
  fullWidth?: boolean;
  fontWeight?: number;
}

const InputRadio: React.FC<InputRadioProps> = ({
  fullWidth,
  fontWeight,
  ...props
}) => {
  return (
    <Radio
      {...props}
      w={fullWidth ? "100%" : undefined}
      classNames={{
        root: style.root,
        radio: style.radio,
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

export default InputRadio;