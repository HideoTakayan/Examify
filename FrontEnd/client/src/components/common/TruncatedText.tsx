import { Text, Tooltip, type TextProps } from '@mantine/core';

type TruncatedTextProps = {
  children: string;
  maxWidth?: number | string;
  fw?: TextProps['fw'];
  size?: TextProps['size'];
  c?: TextProps['c'];
  emptyPlaceholder?: string;
};

export default function TruncatedText({
  children,
  maxWidth = 280,
  fw,
  size = 'sm',
  c,
  emptyPlaceholder = '—',
}: TruncatedTextProps) {
  const text = children?.trim() || '';

  if (!text) {
    return (
      <Text size={size} c="dimmed">
        {emptyPlaceholder}
      </Text>
    );
  }

  return (
    <Tooltip label={text} withArrow multiline maw={420} openDelay={280}>
      <Text fw={fw} size={size} c={c} truncate maw={maxWidth} style={{ display: 'block' }}>
        {text}
      </Text>
    </Tooltip>
  );
}
