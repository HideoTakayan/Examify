import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import SegmentedControls from "./SegmentedControls";

const meta: Meta<typeof SegmentedControls> = {
  title: "Navigation/SegmentedControls",
  component: SegmentedControls,
};

export default meta;
type Story = StoryObj<typeof SegmentedControls>;

export const Primary: Story = {
  render: () => {
    const [value, setValue] = useState("grid");
    return <SegmentedControls value={value} onChange={setValue} />;
  },
};
