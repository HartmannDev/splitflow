import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  LogOut,
  Menu,
  Plus,
  X,
} from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useCurrentUserQuery, useLogoutMutation } from "@/app/auth";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/feedback/ThemeToggle";
import { AppNav } from "@/components/navigation/AppNav";
import styles from "@/layouts/UserLayout.module.css";
import { userBottomNavigation, userNavigation } from "@/lib/navigation";

export function UserLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useCurrentUserQuery();
  const logoutMutation = useLogoutMutation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const createType = new URLSearchParams(location.search).get("type");

  const pageTitle =
    location.pathname === "/app"
      ? "Dashboard"
      : location.pathname.startsWith("/app/accounts")
        ? "Accounts"
        : location.pathname.startsWith("/app/reports")
          ? "Reports"
          : location.pathname.startsWith("/app/categories")
            ? "Categories"
            : location.pathname.startsWith("/app/tags")
              ? "Tags"
              : location.pathname.startsWith("/app/transactions/new")
                ? createType === "income"
                  ? "New income"
                  : createType === "transfer"
                    ? "New transfer"
                    : "New expense"
                : location.pathname.startsWith("/app/transactions")
                  ? "Transactions"
                  : location.pathname.startsWith("/app/notifications")
                    ? "Notifications"
                    : location.pathname.startsWith("/app/settings")
                      ? "Settings"
                      : "SplitFlow";

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    startTransition(() => navigate("/login", { replace: true }));
  };

  const createActions = [
    { label: "Income", icon: ArrowDownLeft, tone: "income" },
    { label: "Expense", icon: ArrowUpRight, tone: "expense" },
    { label: "Transfer", icon: ArrowLeftRight, tone: "transfer" },
  ] as const;

  const userInitials = user
    ? `${user.name.charAt(0)}${user.lastname.charAt(0)}`.toUpperCase()
    : "SF";
  const userDisplayName = user
    ? [user.name, user.lastname]
        .map((part) =>
          part
            .trim()
            .toLowerCase()
            .replace(/^\p{L}/u, (letter) => letter.toUpperCase()),
        )
        .join(" ")
    : "Workspace";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        isProfileCardOpen &&
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileCardOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isProfileCardOpen]);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.brandBlock}>
            <BrandMark inverse logoOnly />
            <div className={styles.appName}>SplitFlow</div>
          </div>
          <AppNav inverse items={userNavigation} />
        </div>
        <div className={styles.sidebarBottom}>
          <AppNav inverse items={userBottomNavigation} />
        </div>
      </aside>

      {isMobileMenuOpen ? (
        <div
          className={styles.mobileMenuOverlay}
          onClick={() => setIsMobileMenuOpen(false)}
          role="presentation"
        >
          <aside
            aria-label="Mobile navigation menu"
            className={styles.mobileMenu}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.mobileMenuHeader}>
              <div className={styles.brandBlock}>
                <BrandMark inverse logoOnly />
                <div className={styles.appName}>SplitFlow</div>
              </div>
              <button
                aria-label="Close menu"
                className={styles.iconButton}
                onClick={() => setIsMobileMenuOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.mobileMenuBody}>
              <div className={styles.sidebarTop}>
                <AppNav
                  inverse
                  items={userNavigation}
                  onNavigate={() => setIsMobileMenuOpen(false)}
                />
              </div>
              <div className={styles.sidebarBottom}>
                <AppNav
                  inverse
                  items={userBottomNavigation}
                  onNavigate={() => setIsMobileMenuOpen(false)}
                />
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <div className={styles.workspace}>
        <header className={styles.header}>
          <div className={styles.headerLead}>
            <button
              aria-label="Open menu"
              className={[styles.iconButton, styles.menuButton].join(" ")}
              onClick={() => setIsMobileMenuOpen(true)}
              type="button"
            >
              <Menu size={18} />
            </button>
            <div className={styles.pageTitle}>{pageTitle}</div>
          </div>
          <div className={styles.toolbar}>
            <ThemeToggle iconOnly />
            <button
              aria-label="Open notifications"
              className={styles.iconButton}
              type="button"
            >
              <Bell size={18} />
            </button>
            <div className={styles.profileMenu} ref={profileRef}>
              <button
                aria-expanded={isProfileCardOpen}
                aria-label="Current user"
                className={styles.userPill}
                onClick={() => setIsProfileCardOpen((current) => !current)}
                type="button"
              >
                <span className={styles.userPillAvatar}>
                  {userInitials}
                </span>
                <span className={styles.userPillName}>
                  {userDisplayName}
                </span>
              </button>

              {isProfileCardOpen ? (
                <div className={styles.profileCard}>
                  <div className={styles.profileCardHeader}>
                    <span className={styles.profileCardAvatar}>{userInitials}</span>
                    <div className={styles.profileCardIdentity}>
                      <div className={styles.profileCardName}>{userDisplayName}</div>
                      <div className={styles.profileCardMeta}>User account</div>
                    </div>
                  </div>
                  <button
                    className={styles.profileCardAction}
                    onClick={() => {
                      setIsProfileCardOpen(false);
                      void handleLogout();
                    }}
                    type="button"
                  >
                    <LogOut size={16} />
                    <span>Log out</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className={styles.main}>
          <Outlet />
        </main>

        {isCreateModalOpen ? (
          <div
            className={styles.fabBackdrop}
            onClick={() => setIsCreateModalOpen(false)}
            role="presentation"
          />
        ) : null}

        <div className={styles.fabCluster}>
          {isCreateModalOpen
            ? createActions.map((action, index) => {
                const Icon = action.icon;

                return (
                  <div
                    className={[
                      styles.fabAction,
                      styles[`fabAction${index + 1}`],
                    ].join(" ")}
                    key={action.label}
                  >
                    <span className={styles.fabActionLabel}>
                      {action.label}
                    </span>
                    <button
                      aria-label={action.label}
                      className={[
                        styles.fabOption,
                        styles[`fabOption${action.tone}`],
                      ].join(" ")}
                      onClick={() => {
                        setIsCreateModalOpen(false);
                        navigate(`/app/transactions/new?type=${action.tone}`);
                      }}
                      type="button"
                    >
                      <Icon size={20} />
                    </button>
                  </div>
                );
              })
            : null}

          <button
            aria-label="Add"
            className={styles.fab}
            onClick={() => setIsCreateModalOpen((current) => !current)}
            title="Add"
            type="button"
          >
            {isCreateModalOpen ? <X size={20} /> : <Plus size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
