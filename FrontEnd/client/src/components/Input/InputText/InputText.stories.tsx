// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from "@storybook/react";
import InputText from "./InputText";
import { IconMail } from "@tabler/icons-react";

const meta: Meta<typeof InputText> = {
  title: "Input/Text",
  component: InputText,
  args: {
    label: "Email",
    placeholder: "Enter email",
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof InputText>;

export const Primary: Story = {};

export const WithIcon: Story = {
  args: {
    leftIcon: <IconMail size={16} />,
  },
};

export const Error: Story = {
  args: {
    error: "Email is invalid",
    leftIcon: <IconMail size={16} />,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: "disabled@email.com",
  },
};