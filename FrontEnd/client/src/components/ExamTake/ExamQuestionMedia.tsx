import { AspectRatio, Box, Button, Image } from '@mantine/core';
import { IconPhotoSearch } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { useTranslation } from 'react-i18next';
import classes from './ExamTake.module.scss';

function guessMediaType(url: string): 'image' | 'audio' | 'video' {
  const u = (url.split('?')[0] ?? url).toLowerCase();
  if (u.includes('/video/upload/') || /\.(mp4|webm|mov|m4v)(\?|$)/.test(u)) return 'video';
  if (u.includes('/raw/upload/') && /\.(mp3|wav|ogg|m4a|aac)(\?|$)/.test(u)) return 'audio';
  if (/\.(mp3|wav|ogg|m4a|aac)(\?|$)/.test(u)) return 'audio';
  return 'image';
}

type Props = { url: string };

/** Media đính kèm câu hỏi (Cloudinary / URL công khai) khi làm bài */
export function ExamQuestionMedia({ url }: Props) {
  const { t } = useTranslation();
  const mt = guessMediaType(url);

  if (mt === 'image') {
    return (
      <Box className={classes.mediaWrap} pos="relative" mb={12}>
        <Image src={url} alt="" fit="cover" h={280} radius="md" />
        <Button
          size="xs"
          variant="white"
          color="dark"
          leftSection={<IconPhotoSearch size={14} />}
          pos="absolute"
          bottom={12}
          right={12}
          onClick={() =>
            modals.open({
              title: t('exam_question.view_image'),
              children: <Image src={url} alt="" fit="contain" maw="100%" />,
            })
          }
        >
          {t('exam_question.zoom')}
        </Button>
      </Box>
    );
  }

  if (mt === 'audio') {
    return (
      <Box className={classes.mediaWrap} mb="sm">
        <Box
          component="audio"
          src={url}
          controls
          w="100%"
          maw={560}
          style={{ display: 'block' }}
        />
      </Box>
    );
  }

  return (
    <AspectRatio ratio={16 / 9} maw={720} mb="sm" mx="auto">
      <Box
        component="video"
        src={url}
        controls
        w="100%"
        h="100%"
        style={{ objectFit: 'contain', borderRadius: 'var(--mantine-radius-md)' }}
      />
    </AspectRatio>
  );
}
