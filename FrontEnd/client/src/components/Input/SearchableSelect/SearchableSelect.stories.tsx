// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from "@storybook/react";
import SearchableSelect, { type OptionType } from "./SearchableSelect";

const options: OptionType[] = [
    { label: "Mathematics", value: "math" },
    { label: "Mathematical Logic", value: "logic" },
    { label: "Advanced Algebra", value: "algebra" },
    { label: "Materials Science", value: "materials" },
];

const meta: Meta<typeof SearchableSelect> = {
    title: "Input/SearchableSelect",
    component: SearchableSelect,
    args: {
        label: "Select Subject",
        placeholder: "Search subjects...",
        data: options,
    },
    decorators: [
        (Story) => (
            <Story />
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof SearchableSelect>;

export const Primary: Story = {
    args: {
        value: null,
    },
};

export const WithValue: Story = {
    args: {
        value: "math",
    },
};

export const Error: Story = {
    args: {
        error: "No subject selected",
        value: null,
    },
};

export const Disabled: Story = {
    args: {
        disabled: true,
        value: "math",
    },
};
