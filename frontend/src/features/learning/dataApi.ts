import toast from 'react-hot-toast';
import { fetchApi } from '../../api/client';

export async function exportData() {
  try {
    const data = await fetchApi('/data/export');
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `memoriser-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  } catch {
    toast.error('Export failed');
  }
}

export async function importData(file: File) {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    toast.error('That file is not valid JSON');
    return;
  }
  try {
    await fetchApi('/data/import', { method: 'POST', body: JSON.stringify(json) });
    toast.success('Data imported successfully. Refreshing...');
    setTimeout(() => window.location.reload(), 1500);
  } catch (e) {
    toast.error(e instanceof Error ? `Import failed: ${e.message}` : 'Import failed');
  }
}
