import React from 'react';
import { Button } from '@mantine/core';
import { type ReactNode } from "react";
import style from './ButtonLight.module.scss'

interface ButtonLightProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    disabled?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    leftSection?: ReactNode;
    rightSection?: ReactNode;
    label?: string;
    fontWeight?: number;
    loading?: boolean;
    color?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    fullWidth?: boolean;
}

const ButtonLight: React.FC<ButtonLightProps> = ({
    leftIcon,
    rightIcon,
    leftSection,
    rightSection,
    label,
    disabled,
    loading,
    color,
    ...props
}) => (
    <Button
        variant="light"
        color={color || 'primary'}
        leftSection={leftIcon || leftSection}
        rightSection={rightIcon || rightSection}
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

export default ButtonLight;
