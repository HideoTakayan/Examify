// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from '@storybook/react';
import ButtonFilled from './ButtonFilled';

const meta: Meta<typeof ButtonFilled> = {
  title: 'Button/Filled',
  component: ButtonFilled,
  args: {
    label: 'Filled Button',
  },
  argTypes: {
    loading: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ButtonFilled>;

export const Primary: Story = {
  args: {
    label: 'Button Created',
    loading: false,
    // rightIcon: <IconArrowRight />,
    // leftIcon: <IconArrowRight />,
  },
};
