import {
  Image,
  Box,
  Flex,
  Group,
  Text,
  Anchor
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import styles from './SideBar.module.scss';
import icon from '@/assets/logo/logo.svg'
import useAuth from '@/hooks/useAuth';
import ButtonFilled from '../Button/ButtonFilled/ButtonFilled';
import NotificationBell from '../common/NotificationBell';

export default function SideBar() {
  const { authenticated } = useAuth();
  const { t } = useTranslation();

  return (
    <Box className={styles.wrapper}>
      <Flex justify={'space-between'} align={'center'} w="100%">
        {/* Logo + brand name */}
        <Anchor c="inherit" underline="never">
          <Group gap="xs" wrap="nowrap">
            <Image
              w={28}
              h={28}
              src={icon}
              className={styles.logoIcon}
            />
            <Text className={styles.brandText}>
              Examify
            </Text>
          </Group>
        </Anchor>

        <Group gap="sm">
          <NotificationBell />
          {!authenticated && <ButtonFilled label={t('common.sign_up')} disabled={false} />}
        </Group>
      </Flex>
    </Box>
  );
}