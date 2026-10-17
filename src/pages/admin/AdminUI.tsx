// src/pages/admin/AdminUI.tsx
import React from 'react';
import { AdminIcon, AdminIconName } from './AdminIcons';

// ----------------------------------------------------
// BUTTON
// ----------------------------------------------------
export interface AdminButtonProps {
  children: React.ReactNode;
  icon?: AdminIconName;
  kind?: 'primary' | 'secondary' | 'quiet' | 'danger';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export const AdminButton: React.FC<AdminButtonProps> = ({
  children,
  icon,
  kind = 'secondary',
  onClick,
  disabled,
  type = 'button',
  className = '',
}) => {
  return (
    <button
      className={`button button-${kind} ${className}`.trim()}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {icon && <AdminIcon name={icon} size={15} />}
      <span>{children}</span>
    </button>
  );
};

// ----------------------------------------------------
// BADGE
// ----------------------------------------------------
export interface AdminBadgeProps {
  children: React.ReactNode;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const AdminBadge: React.FC<AdminBadgeProps> = ({
  children,
  tone = 'neutral',
  className = '',
}) => {
  return (
    <span className={`badge badge-${tone} ${className}`.trim()}>
      {children}
    </span>
  );
};

// ----------------------------------------------------
// TOGGLE SWITCH
// ----------------------------------------------------
export interface AdminToggleProps {
  checked: boolean;
  label: string;
  onChange: (val: boolean) => void;
}

export const AdminToggle: React.FC<AdminToggleProps> = ({
  checked,
  label,
  onChange,
}) => {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={`toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span />
    </button>
  );
};

// ----------------------------------------------------
// PANEL & HEADERS
// ----------------------------------------------------
export interface AdminPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  children,
  className = '',
  style,
}) => {
  return (
    <section className={`panel ${className}`.trim()} style={style}>
      {children}
    </section>
  );
};

export interface AdminPanelHeadProps {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}

export const AdminPanelHead: React.FC<AdminPanelHeadProps> = ({
  eyebrow,
  title,
  action,
}) => {
  return (
    <div className="panel-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
};

export interface AdminPageHeadProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const AdminPageHead: React.FC<AdminPageHeadProps> = ({
  title,
  subtitle,
  actions,
}) => {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
};

// ----------------------------------------------------
// SETTING ROW
// ----------------------------------------------------
export interface AdminSettingRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const AdminSettingRow: React.FC<AdminSettingRowProps> = ({
  title,
  description,
  checked,
  onChange,
}) => {
  return (
    <div className="setting-row">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <AdminToggle checked={checked} label={title} onChange={onChange} />
    </div>
  );
};

// ----------------------------------------------------
// FEEDBACK BANNER
// ----------------------------------------------------
export interface AdminFeedbackProps {
  children: React.ReactNode;
  tone?: 'success' | 'warning' | 'error' | 'info';
}

export const AdminFeedback: React.FC<AdminFeedbackProps> = ({
  children,
  tone = 'success',
}) => {
  const iconName = tone === 'error' ? 'error' : tone === 'warning' ? 'warning' : 'check';
  return (
    <div className={`feedback feedback-${tone}`}>
      <AdminIcon name={iconName} size={16} />
      <span>{children}</span>
    </div>
  );
};

// ----------------------------------------------------
// EMPTY STATE
// ----------------------------------------------------
export interface AdminEmptyStateProps {
  title: string;
  text: string;
}

export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  title,
  text,
}) => {
  return (
    <div className="empty-state">
      <AdminIcon name="search" size={23} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
};

// ----------------------------------------------------
// STAT CARD (KPI)
// ----------------------------------------------------
export interface AdminStatCardProps {
  label: string;
  value: string | number;
  detail: string;
  icon: AdminIconName;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  detail,
  icon,
  tone = 'info',
  onClick,
}) => {
  return (
    <button
      className="stat-card"
      onClick={onClick}
      type="button"
      style={{ cursor: onClick ? 'pointer' : 'default', overflow: 'hidden' }}
    >
      <span className={`stat-icon stat-${tone}`}>
        <AdminIcon name={icon} />
      </span>
      <span style={{ minWidth: 0, overflow: 'hidden' }}>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </span>
    </button>
  );
};

// ----------------------------------------------------
// SERVICE ROW
// ----------------------------------------------------
export interface AdminServiceRowProps {
  icon: AdminIconName;
  name: string;
  detail?: string;
  status?: 'Healthy' | 'Degraded' | 'Offline';
  metric?: string;
}

export const AdminServiceRow: React.FC<AdminServiceRowProps> = ({
  icon,
  name,
  detail,
  status = 'Healthy',
  metric,
}) => {
  const badgeTone = status === 'Healthy' ? 'success' : status === 'Degraded' ? 'warning' : 'danger';
  return (
    <div className="service-row">
      <span className="service-icon">
        <AdminIcon name={icon} />
      </span>
      <div>
        <strong>{name}</strong>
        {detail && <p>{detail}</p>}
      </div>
      <AdminBadge tone={badgeTone}>
        <i />
        {status}
      </AdminBadge>
      {metric && <small>{metric}</small>}
    </div>
  );
};

// ----------------------------------------------------
// BAR CHART
// ----------------------------------------------------
const DEFAULT_BARS = [38, 49, 42, 58, 53, 72, 68, 81, 76, 91, 87, 100];
const DEFAULT_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S', 'M', 'T', 'W', 'T', 'F'];

export interface AdminBarChartProps {
  values?: number[];
  labels?: string[];
}

export const AdminBarChart: React.FC<AdminBarChartProps> = ({
  values = DEFAULT_BARS,
  labels = DEFAULT_LABELS,
}) => {
  return (
    <div className="bar-chart" aria-label="Activity chart">
      {values.map((val, idx) => (
        <div key={idx}>
          <i style={{ height: `${val}%` }} />
          <small>{labels[idx] ?? DEFAULT_LABELS[idx]}</small>
        </div>
      ))}
    </div>
  );
};
