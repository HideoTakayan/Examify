import type { Meta, StoryObj } from "@storybook/react-vite";
import CompactStatusBar from "./CompactStatusBar";

const meta: Meta<typeof CompactStatusBar> = {
  title: "Navigation/CompactStatusBar",
  component: CompactStatusBar,
};

export default meta;
type Story = StoryObj<typeof CompactStatusBar>;

export const Primary: Story = {};
