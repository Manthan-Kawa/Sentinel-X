import { PlaceholderPage } from '@/components/Layout';
import { Network, FileText, Bell, Settings } from 'lucide-react';

export function CampaignsPage() {
  return (
    <PlaceholderPage
      icon={Network}
      title="Campaigns"
      description="Cluster related threats into campaigns and track their evolution over time. Will be available in a future phase."
    />
  );
}

export function ReportsPage() {
  return (
    <PlaceholderPage
      icon={FileText}
      title="Reports"
      description="Generate and export forensic reports in multiple formats. Will be available in a future phase."
    />
  );
}

export function AlertsPage() {
  return (
    <PlaceholderPage
      icon={Bell}
      title="Alerts"
      description="Real-time alert feed with severity filtering and acknowledgment. Will be available in a future phase."
    />
  );
}

export function SettingsPage() {
  return (
    <PlaceholderPage
      icon={Settings}
      title="Settings"
      description="Configure detection rules, notification preferences, and platform integrations. Will be available in a future phase."
    />
  );
}
