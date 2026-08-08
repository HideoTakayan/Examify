// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from '@storybook/react';
import ButtonOutline from './ButtonOutline';
import { IconArrowRight } from '@tabler/icons-react';

const meta: Meta<typeof ButtonOutline> = {
    title: 'Button/Outline',
    component: ButtonOutline,
    args: {
        label: 'Button',
        loading: false,
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

type Story = StoryObj<typeof ButtonOutline>;

export const Primary: Story = {
    args: {
        label: 'Button Created',
        rightIcon: <IconArrowRight />,
        leftIcon: <IconArrowRight />,
    },
};
