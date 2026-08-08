import type { Meta, StoryObj } from "@storybook/react-vite";
import SectionProgressVertical from "./SectionProgressVertical";

const meta: Meta<typeof SectionProgressVertical> = {
  title: "Navigation/SectionProgressVertical",
  component: SectionProgressVertical,
};

export default meta;
type Story = StoryObj<typeof SectionProgressVertical>;

export const Primary: Story = {};
