// src/pages/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminShell } from './AdminShell';
import { AdminOverviewPage } from './AdminOverviewPage';
import { UserManagementPage } from './UserManagementPage';
import { PoliciesAIPage } from './PoliciesAIPage';
import { IntegrationsSecurityPage } from './IntegrationsSecurityPage';
import { MonitoringAuditPage } from './MonitoringAuditPage';
import './AdminDashboard.css';

export type AdminScreenTab =
  | 'overview'
  | 'users'
  | 'policies-ai'
  | 'integrations-security'
  | 'monitoring-audit';

interface AdminDashboardProps {
  initialTab?: AdminScreenTab;
}

export default function AdminDashboard({ initialTab = 'overview' }: AdminDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const getTabFromPath = (path: string): AdminScreenTab => {
    if (path.includes('/admin/users')) return 'users';
    if (path.includes('/admin/policies-ai')) return 'policies-ai';
    if (path.includes('/admin/integrations-security')) return 'integrations-security';
    if (path.includes('/admin/monitoring-audit')) return 'monitoring-audit';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<AdminScreenTab>(
    initialTab || getTabFromPath(location.pathname)
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else {
      setActiveTab(getTabFromPath(location.pathname));
    }
  }, [initialTab, location.pathname]);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const getActivePath = (): string => {
    switch (activeTab) {
      case 'users':
        return '/admin/users';
      case 'policies-ai':
        return '/admin/policies-ai';
      case 'integrations-security':
        return '/admin/integrations-security';
      case 'monitoring-audit':
        return '/admin/monitoring-audit';
      case 'overview':
      default:
        return '/admin/overview';
    }
  };

  return (
    <AdminShell activePath={getActivePath()} onNavigate={handleNavigate}>
      {activeTab === 'overview' && <AdminOverviewPage onNavigate={handleNavigate} />}
      {activeTab === 'users' && <UserManagementPage />}
      {activeTab === 'policies-ai' && <PoliciesAIPage />}
      {activeTab === 'integrations-security' && <IntegrationsSecurityPage />}
      {activeTab === 'monitoring-audit' && <MonitoringAuditPage />}
    </AdminShell>
  );
}
