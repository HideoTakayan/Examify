// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from '@storybook/react';
import ButtonTransparent from './ButtonTransparent';
import { IconArrowRight } from '@tabler/icons-react';

const meta: Meta<typeof ButtonTransparent> = {
    title: 'Button/Transparent',
    component: ButtonTransparent,
    args: {
        label: 'Button',
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

type Story = StoryObj<typeof ButtonTransparent>;

export const Primary: Story = {
    args: {
        label: 'Button Created',
        rightIcon: <IconArrowRight />,
    },
};
