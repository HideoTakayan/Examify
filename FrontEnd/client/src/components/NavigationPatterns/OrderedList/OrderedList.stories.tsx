import type { Meta, StoryObj } from "@storybook/react-vite";
import OrderedList from "./OrderedList";

const meta: Meta<typeof OrderedList> = {
  title: "Navigation/OrderedList",
  component: OrderedList,
};

export default meta;
type Story = StoryObj<typeof OrderedList>;

export const Primary: Story = {};
