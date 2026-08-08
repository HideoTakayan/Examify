import type { Meta, StoryObj } from "@storybook/react-vite";
import StandardNumeric from "./StandardNumeric";

const meta: Meta<typeof StandardNumeric> = {
  title: "Navigation/StandardNumeric",
  component: StandardNumeric,
};

export default meta;
type Story = StoryObj<typeof StandardNumeric>;

export const Primary: Story = {};
