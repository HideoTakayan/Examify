import React from "react";
import { DatePickerInput, type DateValue } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";
import style from "./SchedulingPanel.module.scss";
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
interface SchedulingPanelProps {
    date?: DateValue;
    onDateChange?: (value: DateValue) => void;
    time?: string | null;
    onTimeChange?: (value: string | null) => void;
    duration?: string | null;
    onDurationChange?: (value: string | null) => void;
    timeOptions?: Array<{ label: string; value: string }>;
    durationOptions?: Array<{ label: string; value: string }>;
    note?: string;
}

// const defaultTimeOptions = [
//     { label: "08:00", value: "08:00" },
//     { label: "09:00", value: "09:00" },
//     { label: "10:00", value: "10:00" },
//     { label: "11:00", value: "11:00" },
// ];

// const defaultDurationOptions = [
//     { label: "60 Minutes", value: "60" },
//     { label: "90 Minutes", value: "90" },
//     { label: "120 Minutes", value: "120" },
//     { label: "180 Minutes", value: "180" },
// ];

const SchedulingPanel: React.FC<SchedulingPanelProps> = ({
    date = null,
    onDateChange,
}) => {
    return (
        <div className={style.root}>
            <DatePickerInput
                label="Exam Start Date"
                placeholder="Select date"
                value={date}
                onChange={onDateChange}
                leftSection={<IconCalendar size={16} stroke={1.8} />}
                classNames={{
                    input: style.input,
                    label: style.label,
                    calendarHeaderLevel: style.calendarHeaderLevel,
                    day: style.day,
                }}
                radius="md"
            />
        </div>
    );
};

export default SchedulingPanel;
