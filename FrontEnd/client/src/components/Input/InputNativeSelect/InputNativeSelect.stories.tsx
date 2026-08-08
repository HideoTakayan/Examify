import type { Meta, StoryObj } from "@storybook/react";
import InputNativeSelect from "./InputNativeSelect";
import { IconCode } from "@tabler/icons-react";

const meta: Meta<typeof InputNativeSelect> = {
  title: "Input/NativeSelect",
  component: InputNativeSelect,
  args: {
    label: "Framework",
    placeholder: "Select framework",
    data: ["React", "Vue", "Angular"],
    fullWidth: true,
    clear: true,
  },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
};

export default meta;

type Story = StoryObj<typeof InputNativeSelect>;

export const Primary: Story = {};

export const WithIcon: Story = {
  args: {
    leftIcon: <IconCode size={16} />,
  },
};

export const Error: Story = {
  args: {
    error: "Required field",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};