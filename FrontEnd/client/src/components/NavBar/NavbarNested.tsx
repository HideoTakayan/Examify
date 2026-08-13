import {
    IconChevronRight,
    IconMenu2,
    IconX,
} from '@tabler/icons-react';
import {
    Group,
    ScrollArea,
    Text,
    UnstyledButton,
    Collapse,
    Avatar,
    Box,
    Stack,
    Tooltip,
} from '@mantine/core';
import { useState, type ComponentType, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@mantine/hooks';
import useAuth from '@/hooks/useAuth';
import { navGroups, protectedRoutes } from '@/configs/routes.config';
import classes from './NavbarNested.module.css';

interface NavbarNestedProps {
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
}

/* ================== LinksGroup ================== */
type NavLink = { labelKey: string; link: string };
type LinksGroupProps = {
    label: string;
    icon: ComponentType<{ size?: number }>;
    links?: NavLink[];
    initiallyOpened?: boolean;
    link?: string;
    collapsed?: boolean;
    onExpand?: () => void;
};

function LinksGroup({ label, icon: Icon, links, initiallyOpened = false, link, collapsed, onExpand }: LinksGroupProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const hasLinks = Array.isArray(links);
    const [opened, setOpened] = useState(initiallyOpened);

    const isActive = link ? location.pathname === link : false;

    const handleClick = () => {
        if (hasLinks) {
            if (collapsed) {
                onExpand?.();
            } else {
                setOpened((o) => !o);
            }
            return;
        }

        if (link) {
            navigate(link);
        }
    };

    const button = (
        <UnstyledButton
            onClick={handleClick}
            className={`${classes.control} ${isActive ? classes.activeLink : ''}`}
        >
            <Group
                justify={collapsed ? 'center' : 'space-between'}
                gap={collapsed ? 0 : 'xs'}
                wrap="nowrap"
                w="100%"
                maw="100%"
            >
                <Group
                    gap="sm"
                    wrap="nowrap"
                    justify={collapsed ? 'center' : 'flex-start'}
                    style={collapsed ? undefined : { flex: 1, minWidth: 0 }}
                >
                    <span style={{ display: 'flex', flexShrink: 0 }}><Icon size={24} /></span>
                    {!collapsed && (
                        <Text size="sm" lineClamp={2} style={{ flex: 1, minWidth: 0 }}>
                            {label}
                        </Text>
                    )}
                </Group>

                {hasLinks && !collapsed && (
                    <IconChevronRight
                        size={16}
                        className={classes.chevron}
                        style={{
                            flexShrink: 0,
                            transform: opened ? 'rotate(90deg)' : 'none',
                        }}
                    />
                )}
            </Group>
        </UnstyledButton>
    );

    if (collapsed) {
        return (
            <Tooltip label={label} position="right" withArrow>
                <Box w="100%">{button}</Box>
            </Tooltip>
        );
    }

    return (
        <>
            {button}
            {hasLinks && (
                <Collapse in={opened}>
                    {links.map((l) => (
                        <UnstyledButton
                            key={l.link}
                            className={classes.link}
                            onClick={() => navigate(l.link)}
                        >
                            <Text size="sm" w="100%">
                                {l.labelKey}
                            </Text>
                        </UnstyledButton>
                    ))}
                </Collapse>
            )}
        </>
    );
}

/* ================== UserButton ================== */

function UserButton({ collapsed }: { collapsed?: boolean }) {
    const navigate = useNavigate();
    const name = localStorage.getItem('user_name') || 'Examify';
    const email = localStorage.getItem('user_email') || 'frontend@dev.com';

    if (collapsed) {
        return (
            <Tooltip label={name} position="right" withArrow>
                <UnstyledButton className={classes.user} onClick={() => navigate('/profile')}>
                    <Avatar radius="xl" />
                </UnstyledButton>
            </Tooltip>
        );
    }

    return (
        <UnstyledButton className={classes.user} onClick={() => navigate('/profile')}>
            <Group>
                <Avatar radius="xl" />

                <Box style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                        {name}
                    </Text>
                    <Text c="dimmed" size="xs">
                        {email}
                    </Text>
                </Box>
            </Group>
        </UnstyledButton>
    );
}

/* ================== NavItem types ================== */
type NavItemChild = { labelKey: string; link: string; order?: number };
type NavItemConfig = {
    key: string;
    labelKey: string;
    icon: ComponentType<{ size?: number }>;
    link?: string;
    children?: NavItemChild[];
    order?: number;
};

/* ================== Navbar ================== */
export function NavbarNested({ collapsed = false, onCollapsedChange }: NavbarNestedProps) {
    const { t } = useTranslation();
    const { userAuthority } = useAuth();
    const isSmallScreen = useMediaQuery('(max-width: 768px)');
    const [localCollapsed, setLocalCollapsed] = useState(collapsed);

    useEffect(() => {
        setLocalCollapsed(collapsed);
    }, [collapsed]);

    useEffect(() => {
        if (isSmallScreen && !localCollapsed) {
            setLocalCollapsed(true);
            onCollapsedChange?.(true);
        }
    }, [isSmallScreen, localCollapsed, onCollapsedChange]);

    const handleToggle = () => {
        const newCollapsed = !localCollapsed;
        setLocalCollapsed(newCollapsed);
        onCollapsedChange?.(newCollapsed);
    };

    // Build nav items from routes.config metadata filtered by authority
    const navItems: NavItemConfig[] = (() => {
        const filteredRoutes = protectedRoutes.filter(route =>
            route.authority.some(auth => userAuthority.includes(auth))
        );

        const sortByOrder = <T extends { order?: number }>(a: T, b: T) =>
            (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);

        const mainItems: NavItemConfig[] = [];
        const groupedChildren: Record<string, NavItemChild[]> = {};

        filteredRoutes.forEach(route => {
            const nav = route.nav;
            if (!nav) {
                return;
            }

            if (nav.position === 'main') {
                if (!nav.icon) {
                    return;
                }

                mainItems.push({
                    key: route.key,
                    labelKey: nav.labelKey,
                    icon: nav.icon,
                    link: route.path,
                    order: nav.order,
                });
                return;
            }

            if (nav.position === 'sub' && nav.groupKey) {
                if (!groupedChildren[nav.groupKey]) {
                    groupedChildren[nav.groupKey] = [];
                }

                groupedChildren[nav.groupKey].push({
                    labelKey: nav.labelKey,
                    link: route.path,
                    order: nav.order,
                });
            }
        });

        const groupItems: NavItemConfig[] = navGroups
            .filter(group => groupedChildren[group.key]?.length)
            .map(group => ({
                key: group.key,
                labelKey: group.labelKey,
                icon: group.icon,
                children: groupedChildren[group.key].sort(sortByOrder),
                order: group.order,
            }));

        return [...mainItems, ...groupItems].sort(sortByOrder);
    })();

    return (
        <nav className={`${classes.navbar} ${localCollapsed ? classes.collapsed : ''}`}>
            <ScrollArea className={classes.links}>
                <div className={classes.linksInner}>
                    {navItems.map((item) => (
                        <LinksGroup
                            key={item.key}
                            label={t(item.labelKey)}
                            icon={item.icon}
                            link={item.link}
                            links={item.children?.map(l => ({ ...l, labelKey: t(l.labelKey) }))}
                            initiallyOpened={true}
                            collapsed={localCollapsed}
                            onExpand={() => {
                                setLocalCollapsed(false);
                                onCollapsedChange?.(false);
                            }}
                        />
                    ))}
                </div>
            </ScrollArea>

            <Stack justify="center" gap={0}>
                <UserButton collapsed={localCollapsed} />
                <UnstyledButton className={classes.toggleBtn} onClick={handleToggle}>
                    {localCollapsed ? <IconMenu2 size={18} /> : <IconX size={18} />}
                </UnstyledButton>
            </Stack>
        </nav>
    );
}