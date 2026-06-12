import { modules } from '@/data/modules';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  return <Dashboard modules={modules} />;
}
