import React from 'react';
import { Button } from '@mantine/core';
import { type ReactNode } from "react";
import style from './ButtonOutline.module.scss'

interface ButtonOutlineProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  disabled: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  label?: string;
  fontWeight?: number;
  loading?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl",
  color?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  fullWidth?: boolean;
}

const ButtonOutline: React.FC<ButtonOutlineProps> = ({
  leftIcon,
  rightIcon,
  label,
  disabled,
  loading,  
  color,
  ...props
}) => (
  <Button
    variant="outline"
    color={color || 'primary'}
    leftSection={leftIcon}
    rightSection={rightIcon}
    disabled={disabled}
    loading={loading}
    {...props}
    classNames={{
      root: style.rootButton,
      loader: style.loaderButton,
      inner: style.innerButton,
      section: style.sectionButton,
      label: style.labelButton
    }}
  >
    {label}
  </Button>
);

export default ButtonOutline;
