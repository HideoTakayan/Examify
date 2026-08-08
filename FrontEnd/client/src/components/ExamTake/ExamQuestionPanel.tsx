import { Badge, Box, Button, Group, Image, Text, Textarea, TextInput } from '@mantine/core';
import {
  IconCircleCheck,
  IconFlag,
  IconFlagFilled,
  IconInfoCircle,
  IconPhotoSearch,
} from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { useTranslation } from 'react-i18next';
import classes from './ExamTake.module.scss';
import type { CompositePart, FillSegment, MockExamQuestion } from './types';
import { ExamAudioPlayer } from './ExamAudioPlayer';
import { ExamVideoPlayer } from './ExamVideoPlayer';
import { ExamQuestionMedia } from './ExamQuestionMedia';
import { McqOptionList } from './McqOptionList';

type Props = {
  question: MockExamQuestion;
  displayIndex: number;
  totalQuestions: number;
  isFlagged: boolean;
  onToggleFlag: () => void;
  /** key -> value (mcq key hoặc essay text hoặc blank) */
  answers: Record<string, string>;
  onAnswerChange: (key: string, value: string) => void;
};

function countWords(s: string) {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

function FillBlankLine({
  segments,
  answerPrefix,
  answers,
  onChange,
}: {
  segments: FillSegment[];
  answerPrefix: string;
  answers: Record<string, string>;
  onChange: (storageKey: string, v: string) => void;
}) {
  return (
    <div className={classes.fillRow}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.value}</span>;
        }
        const storageKey = `${answerPrefix}-${seg.id}`;
        return (
          <TextInput
            key={seg.id}
            classNames={{ input: classes.blankInput }}
            size="sm"
            radius="md"
            placeholder={seg.placeholder ?? '...'}
            value={answers[storageKey] ?? ''}
            onChange={(e) => onChange(storageKey, e.currentTarget.value)}
          />
        );
      })}
    </div>
  );
}

function PartMcq({
  part,
  value,
  onChange,
}: {
  part: Extract<CompositePart, { kind: 'mcq' }>;
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <Box className={classes.partBlock}>
      <Group justify="space-between" mb="xs">
        <Text fw={600}>{part.prompt}</Text>
        {part.badge && (
          <Badge variant="light" color="primary">
            {part.badge}
          </Badge>
        )}
      </Group>
      <McqOptionList options={part.options} value={value} onChange={onChange} />
    </Box>
  );
}

function PartEssay({
  part,
  value,
  onChange,
}: {
  part: Extract<CompositePart, { kind: 'essay' }>;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  const max = part.maxWords ?? 150;
  const wc = countWords(value);
  return (
    <Box className={classes.partBlock}>
      <Group justify="space-between" mb="xs" align="flex-start">
        <Text fw={600}>{part.prompt}</Text>
        {part.badge && (
          <Badge variant="light" color="gray">
            {part.badge}
          </Badge>
        )}
      </Group>
      <Textarea
        minRows={4}
        radius="md"
        placeholder={part.placeholder}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
      <Text size="xs" c="dimmed" ta="right" mt={6}>
        {t('exam_question.word_count', { count: wc, max })}
      </Text>
    </Box>
  );
}

function hasDraftForQuestion(
  question: MockExamQuestion,
  qPrefix: string,
  answers: Record<string, string>,
) {
  switch (question.type) {
    case 'mcq':
    case 'audio_mcq':
    case 'image_mcq':
      return Boolean(answers[qPrefix]);
    case 'essay':
      return Boolean(answers[qPrefix]?.trim());
    case 'fill_blank':
      return Boolean(
        question.fillSegments?.some((s) => {
          if (s.type !== 'blank') return false;
          return Boolean(answers[`${qPrefix}-${s.id}`]?.trim());
        }),
      );
    case 'composite': {
      const parts = question.composite?.parts;
      if (!parts?.length) return false;
      return parts.some((part) => {
        const pk = `${qPrefix}-${part.id}`;
        if (part.kind === 'mcq') return Boolean(answers[pk]);
        return Boolean(answers[pk]?.trim());
      });
    }
    default:
      return false;
  }
}

export function ExamQuestionPanel({
  question,
  displayIndex,
  totalQuestions,
  isFlagged,
  onToggleFlag,
  answers,
  onAnswerChange,
}: Props) {
  const { t } = useTranslation();
  const qPrefix = `q${question.number}`;

  const renderMcq = (options: { key: string; label: string }[], answerKey: string) => (
    <McqOptionList
      options={options}
      value={answers[answerKey] ?? null}
      onChange={(k) => onAnswerChange(answerKey, k)}
      onClear={() => onAnswerChange(answerKey, '')}
    />
  );

  const inner = () => {
    switch (question.type) {
      case 'mcq':
        return (
          <>
            <div className={classes.questionText}>{question.prompt}</div>
            {question.media_url ? <ExamQuestionMedia url={question.media_url} /> : null}
            {question.options && renderMcq(question.options, qPrefix)}
          </>
        );

      case 'audio_mcq':
        return (
          <>
            <div className={classes.questionText}>{question.prompt}</div>
            <ExamAudioPlayer label={question.audioClipLabel ?? t('exam_question.audio')} />
            {question.options && renderMcq(question.options, qPrefix)}
          </>
        );

      case 'image_mcq':
        return (
          <>
            <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
              <div className={classes.questionText} style={{ marginBottom: 0 }}>
                {question.prompt}
              </div>
              {question.points != null && (
                <Badge variant="light" color="gray">
                  {t('exam_question.points', { count: question.points })}
                </Badge>
              )}
            </Group>
            <div className={classes.mediaWrap} style={{ position: 'relative' }}>
              <Image src={question.imageSrc} alt={question.imageAlt ?? ''} fit="cover" h={280} />
              <Button
                size="xs"
                variant="white"
                color="dark"
                leftSection={<IconPhotoSearch size={14} />}
                style={{ position: 'absolute', bottom: 12, right: 12 }}
                onClick={() =>
                  modals.open({
                    title: t('exam_question.view_image'),
                    children: (
                      <Image src={question.imageSrc} alt={question.imageAlt ?? ''} fit="contain" />
                    ),
                  })
                }
              >
                {t('exam_question.zoom')}
              </Button>
            </div>
            {question.options && renderMcq(question.options, qPrefix)}
          </>
        );

      case 'fill_blank':
        return (
          <>
            <Text fw={600} mb="md">
              {t('exam_question.fill_blank')}
            </Text>
            {question.fillSegments && (
              <FillBlankLine
                segments={question.fillSegments}
                answerPrefix={qPrefix}
                answers={answers}
                onChange={(storageKey, v) => onAnswerChange(storageKey, v)}
              />
            )}
          </>
        );

      case 'essay':
        return (
          <>
            <div className={classes.questionText}>{question.prompt}</div>
            {question.media_url ? <ExamQuestionMedia url={question.media_url} /> : null}
            <Textarea
              minRows={6}
              radius="md"
              placeholder={question.essay?.placeholder}
              value={answers[qPrefix] ?? ''}
              onChange={(e) => onAnswerChange(qPrefix, e.currentTarget.value)}
            />
            <Text size="xs" c="dimmed" ta="right" mt={6}>
              {t('exam_question.word_count', {
                count: countWords(answers[qPrefix] ?? ''),
                max: question.essay?.maxWords ?? 200,
              })}
            </Text>
          </>
        );

      case 'composite': {
        const comp = question.composite;
        if (!comp) return null;
        return (
          <>
            <ExamVideoPlayer caption={comp.videoCaption} badge={comp.viewsRemainingBadge} />
            {comp.parts.map((part) => {
              const pk = `${qPrefix}-${part.id}`;
              if (part.kind === 'mcq') {
                return (
                  <PartMcq
                    key={part.id}
                    part={part}
                    value={answers[pk] ?? null}
                    onChange={(v) => onAnswerChange(pk, v)}
                  />
                );
              }
              return (
                <PartEssay
                  key={part.id}
                  part={part}
                  value={answers[pk] ?? ''}
                  onChange={(v) => onAnswerChange(pk, v)}
                />
              );
            })}
          </>
        );
      }

      default:
        return null;
    }
  };

  const showSaved = hasDraftForQuestion(question, qPrefix, answers);

  return (
    <article className={classes.mainCard}>
      <div className={classes.cardTop}>
        <div>
          {question.badge && (
            <Badge variant="light" color="gray" mb={6}>
              {question.badge}
            </Badge>
          )}
          <div className={classes.progressBar}>
            <div
              className={classes.progressBarFill}
              style={{ width: `${Math.min(100, (displayIndex / totalQuestions) * 100)}%` }}
            />
          </div>
          {showSaved && (
            <div className={classes.savedPill} style={{ marginTop: 8 }}>
              <IconCircleCheck size={16} />
              {t('exam_question.draft_saved')}
            </div>
          )}
        </div>
        <Group gap="sm" wrap="nowrap">
          {question.points != null && question.type !== 'image_mcq' && (
            <Text size="sm" fw={700}>
              {t('exam_question.points', { count: question.points })}
            </Text>
          )}
          <Button
            variant="subtle"
            color="gray"
            leftSection={isFlagged ? <IconFlagFilled size={18} /> : <IconFlag size={18} />}
            onClick={onToggleFlag}
          >
            {isFlagged ? t('exam_question.flag_remove') : t('exam_question.flag_add')}
          </Button>
        </Group>
      </div>

      {inner()}

      {question.sidebarNote && (
        <div className={classes.instructions}>
          <IconInfoCircle size={18} style={{ flexShrink: 0 }} />
          <span>{question.sidebarNote}</span>
        </div>
      )}
    </article>
  );
}
