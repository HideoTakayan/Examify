import type { Meta, StoryObj } from "@storybook/react-vite";
import HorizontalProgress from "./HorizontalProgress";

const meta: Meta<typeof HorizontalProgress> = {
  title: "Navigation/HorizontalProgress",
  component: HorizontalProgress,
};

export default meta;
type Story = StoryObj<typeof HorizontalProgress>;

export const Primary: Story = {};
