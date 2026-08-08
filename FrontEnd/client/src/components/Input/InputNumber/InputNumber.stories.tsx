import type { Meta, StoryObj } from "@storybook/react";
import InputNumber from "./InputNumber";
import { IconCoin } from "@tabler/icons-react";

const meta: Meta<typeof InputNumber> = {
  title: "Input/Number",
  component: InputNumber,
  args: {
    label: "Amount",
    placeholder: "Enter amount",
    fullWidth: true,
  },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
};

export default meta;

type Story = StoryObj<typeof InputNumber>;

export const Primary: Story = {};

export const WithIcon: Story = {
  args: {
    leftIcon: <IconCoin size={16} />,
  },
};

export const Error: Story = {
  args: {
    error: "Invalid amount",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 100,
  },
};