import type { Meta, StoryObj } from "@storybook/react";
import InputTextarea from "./InputTextarea";

const meta: Meta<typeof InputTextarea> = {
  title: "Input/Textarea",
  component: InputTextarea,
  args: {
    label: "Description",
    placeholder: "Enter description",
    fullWidth: true,
  },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
};

export default meta;

type Story = StoryObj<typeof InputTextarea>;

export const Primary: Story = {};

export const Error: Story = {
  args: {
    error: "Description required",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: "Disabled content",
  },
};