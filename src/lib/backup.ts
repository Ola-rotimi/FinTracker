/**
 * Full-data backup and restore as a single JSON file the user saves wherever they like
 * (Files, Google Drive, email…). Nothing is uploaded by the app itself.
 */
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Sharing from 'expo-sharing';
import { exportSnapshot, SnapshotError, validateSnapshot, type Snapshot } from '@/db/snapshot';
import { todayISO } from './dates';

export { importSnapshot as restoreBackup, SnapshotError as BackupError } from '@/db/snapshot';
export type BackupFile = Snapshot;

/** Writes a backup to the cache directory and opens the share sheet so the user can save it. */
export async function shareBackup(db: SQLiteDatabase) {
  const snapshot = await exportSnapshot(db);
  const file = new File(Paths.cache, `BudT-backup-${todayISO()}.json`);
  file.create({ overwrite: true });
  await file.write(JSON.stringify(snapshot));

  if (!(await Sharing.isAvailableAsync())) throw new SnapshotError('Sharing isn’t available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your BudT backup' });
}

/** Lets the user pick a backup file and validates it. Returns null if they cancel. */
export async function pickBackup(): Promise<BackupFile | null> {
  // Android often reports JSON as application/octet-stream, so accept any file and validate the contents.
  const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (picked.canceled || !picked.assets?.length) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(await new File(picked.assets[0].uri).text());
  } catch {
    throw new SnapshotError('That file isn’t a BudT backup.');
  }
  return validateSnapshot(parsed);
}
