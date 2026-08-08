import type { Meta, StoryObj } from "@storybook/react";
import InputRadio from "./InputRadio";

const meta: Meta<typeof InputRadio> = {
  title: "Input/Radio",
  component: InputRadio,
  decorators: [
    (Story) => (
      <div style={{ padding: 40 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof InputRadio>;

export const Selected: Story = {
  args: {
    label: "Selected",
    defaultChecked: true,
  },
};

export const Unselected: Story = {
  args: {
    label: "Unselected",
  },
};

export const SelectedDisabled: Story = {
  args: {
    label: "Selected (Disabled)",
    defaultChecked: true,
    disabled: true,
  },
};

export const UnselectedDisabled: Story = {
  args: {
    label: "Unselected (Disabled)",
    disabled: true,
  },
};