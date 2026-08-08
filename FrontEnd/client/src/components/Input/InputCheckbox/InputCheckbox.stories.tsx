import type { Meta, StoryObj } from "@storybook/react";
import InputCheckbox from "./InputCheckbox";

const meta: Meta<typeof InputCheckbox> = {
  title: "Input/InputCheckbox",
  component: InputCheckbox,
  decorators: [
    (Story) => (
      <div style={{ padding: 40 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof InputCheckbox>;

export const Checked: Story = {
  args: {
    label: "Checked",
    defaultChecked: true,
  },
};

export const Unchecked: Story = {
  args: {
    label: "Unchecked",
  },
};

export const Indeterminate: Story = {
  args: {
    label: "Indeterminate",
    indeterminate: true,
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled",
    disabled: true,
    defaultChecked: true,
  },
};