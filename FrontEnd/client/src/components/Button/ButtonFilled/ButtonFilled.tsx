import React from 'react';
import { Button } from '@mantine/core';
import { type ReactNode } from "react";
import style from './ButtonFilled.module.scss'
interface ButtonFilledProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  disabled: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  label?: string;
  fontWeight?: number;
  loading?: boolean;
  color?: string; 
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  fullWidth?: boolean;
}

const ButtonFilled: React.FC<ButtonFilledProps> = ({
  leftIcon,
  rightIcon,
  label,
  disabled,
  loading,
  color,
  ...props
}) => (
  <Button
    variant="filled"
    color={color || 'primary'}
    leftSection={leftIcon}
    rightSection={rightIcon}
    disabled={disabled}
    loading={loading}
    classNames={{
      root: style.rootButton,
      loader: style.loaderButton,
      inner: style.innerButton,
      section: style.sectionButton,
      label: style.labelButton
    }}
    {...props}
  >
    {label}
  </Button>
);

export default ButtonFilled;
