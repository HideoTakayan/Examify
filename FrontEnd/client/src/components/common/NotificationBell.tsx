import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Box, Button, Divider, Group, Menu, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, type UserNotificationItem } from '@/services/notificationApi';
import { sanitizeScoreInText } from '@/utils/formatExamScore';

/** Chỉ poll badge khi menu đóng — tránh spam API trên production. */
const UNREAD_POLL_MS = 3 * 60_000;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins}p trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h trước`;
  const days = Math.floor(hrs / 24);
  return `${days}d trước`;
}

function typeColor(type: UserNotificationItem['type']): string {
  switch (type) {
    case 'warning': return 'var(--mantine-color-yellow-6)';
    case 'error': return 'var(--mantine-color-red-6)';
    case 'success': return 'var(--mantine-color-green-6)';
    default: return 'var(--mantine-color-blue-6)';
  }
}

export default function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const inFlightRef = useRef(false);
  const openedRef = useRef(false);

  const refreshUnreadCount = useCallback(async () => {
    if (inFlightRef.current || document.visibilityState === 'hidden') return;
    inFlightRef.current = true;
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[NotificationBell] unread-count failed', err);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const refreshList = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const listRes = await getNotifications({ limit: 10 });
      setNotifications(listRes.items);
      if (listRes.unread_count != null) {
        setUnreadCount(listRes.unread_count);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[NotificationBell] list failed', err);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    openedRef.current = opened;
  }, [opened]);

  useEffect(() => {
    void refreshUnreadCount();

    const pollId = window.setInterval(() => {
      if (!openedRef.current) {
        void refreshUnreadCount();
      }
    }, UNREAD_POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !openedRef.current) {
        void refreshUnreadCount();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (opened) {
      void refreshList();
    }
  }, [opened, refreshList]);

  async function handleMarkAll() {
    setLoading(true);
    try {
      await markAllAsRead();
      await refreshList();
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkOne(id: string) {
    try {
      await markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  }

  return (
    <Menu shadow="md" width={360} opened={opened} onChange={setOpened} position="bottom-end">
      <Menu.Target>
        <Box pos="relative" style={{ cursor: 'pointer' }}>
          <Tooltip label={t('notification.tooltip')}>
            <Button variant="subtle" color="gray" size="md" px={8} aria-label="Notifications">
              <Bell size={20} />
            </Button>
          </Tooltip>
          {unreadCount > 0 && (
            <Badge
              size="xs"
              variant="filled"
              color="red"
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                minWidth: 16,
                height: 16,
                padding: '0 4px',
                fontSize: 10,
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Box>
      </Menu.Target>

      <Menu.Dropdown p={0}>
        <Group justify="space-between" p="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
          <Text fw={600} size="sm">{t('notification.title')}</Text>
          {unreadCount > 0 && (
            <Tooltip label={t('notification.mark_all_read')}>
              <Button variant="subtle" size="xs" color="blue" onClick={handleMarkAll} loading={loading}>
                <CheckCheck size={16} />
              </Button>
            </Tooltip>
          )}
        </Group>

        <Box style={{ maxHeight: 360, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="xl">
              {t('notification.empty')}
            </Text>
          ) : (
            notifications.map(n => (
              <Box
                key={n.id}
                style={{
                  background: n.is_read ? undefined : 'var(--mantine-color-blue-0)',
                  borderLeft: `3px solid ${n.is_read ? 'transparent' : typeColor(n.type)}`,
                }}
              >
                <Box p="xs">
                  <Group justify="space-between" wrap="nowrap" gap={4}>
                    <Text size="sm" fw={n.is_read ? 400 : 600} lineClamp={1} style={{ flex: 1 }}>
                      {n.title}
                    </Text>
                    {!n.is_read && (
                      <Tooltip label={t('notification.mark_read')}>
                        <Button variant="subtle" size="xs" color="green" onClick={() => { void handleMarkOne(n.id); }} style={{ flexShrink: 0 }}>
                          <Check size={14} />
                        </Button>
                      </Tooltip>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" mt={2} lineClamp={2}>{sanitizeScoreInText(n.message)}</Text>
                  <Group justify="space-between" mt={4}>
                    <Text size="xs" c="dimmed">{timeAgo(n.created_at)}</Text>
                    {n.link && (
                      <Tooltip label={t('notification.go_to')}>
                        <Button
                          variant="subtle"
                          size="xs"
                          p={2}
                          onClick={() => {
                            void handleMarkOne(n.id);
                            if (n.link!.startsWith('/')) {
                              navigate(n.link!);
                            } else {
                              window.open(n.link!, '_blank', 'noopener,noreferrer');
                            }
                          }}
                        >
                          <ExternalLink size={12} />
                        </Button>
                      </Tooltip>
                    )}
                  </Group>
                </Box>
                <Divider />
              </Box>
            ))
          )}
        </Box>

        {notifications.length > 0 && (
          <Box p="xs" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
            <Button
              variant="subtle"
              size="xs"
              fullWidth
              onClick={() => { window.location.href = '/notifications'; }}
            >
              {t('common.view_all')}
            </Button>
          </Box>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
