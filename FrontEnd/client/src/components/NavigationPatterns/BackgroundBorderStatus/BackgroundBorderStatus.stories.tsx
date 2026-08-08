import type { Meta, StoryObj } from "@storybook/react-vite";
import BackgroundBorderStatus from "./BackgroundBorderStatus";

const meta: Meta<typeof BackgroundBorderStatus> = {
  title: "Navigation/BackgroundBorderStatus",
  component: BackgroundBorderStatus,
};

export default meta;
type Story = StoryObj<typeof BackgroundBorderStatus>;

export const Primary: Story = {};
