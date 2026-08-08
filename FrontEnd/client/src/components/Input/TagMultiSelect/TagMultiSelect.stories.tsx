import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import TagMultiSelect, { type MultiSelectOption } from "./TagMultiSelect";

const options: MultiSelectOption[] = [
  { label: "Calculus", value: "calculus" },
  { label: "Linear Algebra", value: "linear-algebra" },
  { label: "Statistics", value: "statistics" },
  { label: "Discrete Mathematics", value: "discrete-math" },
];

const meta: Meta<typeof TagMultiSelect> = {
  title: "Input/TagMultiSelect",
  component: TagMultiSelect,
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TagMultiSelect>;

export const Primary: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>([
      "calculus",
      "linear-algebra",
      "statistics",
    ]);

    return <TagMultiSelect {...args} value={value} onChange={setValue} />;
  },
  args: {
    label: "Exam Topics",
    placeholder: "Add topic",
    data: options,
  },
};

export const Error: Story = {
  args: {
    label: "Exam Topics",
    placeholder: "Add topic",
    data: options,
    value: [],
    error: "Please select at least one topic",
  },
};

export const Disabled: Story = {
  args: {
    label: "Exam Topics",
    placeholder: "Add topic",
    data: options,
    value: ["calculus", "statistics"],
    disabled: true,
  },
};
