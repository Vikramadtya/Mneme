
import { fetchApi } from '../../api/client';
import toast from 'react-hot-toast';

export async function exportData() {
    try {
        const data = await fetchApi('/data/export');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `memoriser-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Data exported successfully');
    } catch (e) {
        toast.error('Export failed');
    }
}

export async function importData(file: File) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                await fetchApi('/data/import', {
                    method: 'POST',
                    body: JSON.stringify(json)
                });
                toast.success('Data imported successfully. Refreshing...');
                setTimeout(() => window.location.reload(), 1500);
                resolve(true);
            } catch (err) {
                toast.error('Invalid backup file');
                reject(err);
            }
        };
        reader.readAsText(file);
    });
}
