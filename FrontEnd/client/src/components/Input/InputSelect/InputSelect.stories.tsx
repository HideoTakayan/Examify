// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import InputSelect from "./InputSelect";

const meta: Meta<typeof InputSelect> = {
  title: "Input/Select",
  component: InputSelect,

  decorators: [
    (Story) => (
      <div
        style={{
          width: 300,
          padding: 40,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof InputSelect>;

const data = [
  "Mathematics",
  "Mathematical Logic",
  "Advanced Algebra",
  "Materials Science",
  "Physics",
  "Chemistry",
];


// Default
export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(null);

    return (
      <InputSelect
        data={data}
        value={value}
        onChange={setValue}
        placeholder="Search subjects..."
      />
    );
  },
};


// Selected
export const Selected: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(
      "Mathematics"
    );

    return (
      <InputSelect
        data={data}
        value={value}
        onChange={setValue}
      />
    );
  },
};


// Error state
export const Error: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(
      null
    );

    return (
      <InputSelect
        data={data}
        value={value}
        onChange={setValue}
        error="Please select at least one subject"
        placeholder="No subject selected"
      />
    );
  },
};


// Disabled
export const Disabled: Story = {
  render: () => (
    <InputSelect
      data={data}
      value="Mathematics"
      disabled
    />
  ),
};


// Clearable
export const Clearable: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(
      "Physics"
    );

    return (
      <InputSelect
        data={data}
        value={value}
        onChange={setValue}
        clearable
      />
    );
  },
};


// Full width
export const FullWidth: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(
      null
    );

    return (
      <InputSelect
        data={data}
        value={value}
        onChange={setValue}
        fullWidth
        placeholder="Select subject"
      />
    );
  },
};