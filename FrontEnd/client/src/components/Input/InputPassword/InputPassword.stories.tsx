import type { Meta, StoryObj } from "@storybook/react";
import InputPassword from "./InputPassword";
import { IconLock } from "@tabler/icons-react";

const meta: Meta<typeof InputPassword> = {
  title: "Input/Password",
  component: InputPassword,
  args: {
    label: "Password",
    placeholder: "Enter password",
    fullWidth: true,
  },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
};

export default meta;

type Story = StoryObj<typeof InputPassword>;

export const Primary: Story = {};

export const WithIcon: Story = {
  args: {
    leftIcon: <IconLock size={16} />,
  },
};

export const Error: Story = {
  args: {
    error: "Password is incorrect",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: "12345678",
  },
};