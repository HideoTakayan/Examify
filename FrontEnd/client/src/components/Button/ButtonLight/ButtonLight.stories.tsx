// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from '@storybook/react';
import ButtonLight from './ButtonLight';
import { IconArrowRight } from '@tabler/icons-react';

const meta: Meta<typeof ButtonLight> = {
    title: 'Button/Light',
    component: ButtonLight,
    args: {
        label: 'Light Button',
        disabled: false
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

type Story = StoryObj<typeof ButtonLight>;

export const Primary: Story = {
    args: {
        label: 'Button Created',
        disabled: true,
        rightIcon: <IconArrowRight />,
        leftIcon: <IconArrowRight />,
    },
};
