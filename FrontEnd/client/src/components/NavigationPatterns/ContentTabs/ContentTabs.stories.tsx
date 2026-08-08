import type { Meta, StoryObj } from "@storybook/react-vite";
import ContentTabs from "./ContentTabs";

const meta: Meta<typeof ContentTabs> = {
  title: "Navigation/ContentTabs",
  component: ContentTabs,
};

export default meta;
type Story = StoryObj<typeof ContentTabs>;

export const Primary: Story = {};
