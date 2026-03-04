import MissionControlClient from '@/components/mission-control/MissionControlClient';

export const metadata = {
  title: 'Mission Control - Executive Dashboard',
  description: 'Life dashboard with digest, meetings, action items, and metrics',
};

export default function MissionControlPage() {
  return <MissionControlClient />;
}
