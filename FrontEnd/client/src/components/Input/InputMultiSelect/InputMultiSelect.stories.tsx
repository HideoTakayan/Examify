import type { Meta, StoryObj } from "@storybook/react";
import InputMultiSelect from "./InputMultiSelect";

const meta: Meta<typeof InputMultiSelect> = {
  title: "Input/MultiSelect",
  component: InputMultiSelect,
};

export default meta;

type Story = StoryObj<typeof InputMultiSelect>;

export const Primary: Story = {
  args: {
    data: [
      "Mathematics",
      "Physics",
      "Chemistry",
    ],
  },
};