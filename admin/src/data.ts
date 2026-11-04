import {
  collection,
  doc,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { deleteObject, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, functions, storage } from './firebase';
import type {
  AdminRole,
  AnalyticsDocument,
  AuditLogDocument,
  CatalogCollection,
  ContentStatus,
  TrackDocument,
  UserDocument,
  UserStatus,
} from './types';

function requireService<T>(service: T | null, name: string): T {
  if (!service) throw new Error(`Firebase is not configured; cannot access ${name}.`);
  return service;
}

function subscribeTo<T extends DocumentData & { id?: string }>(
  path: string,
  constraints: QueryConstraint[],
  onData: (items: T[]) => void,
  onError: (error: Error) => void,
) {
  const firestore = requireService(db, 'Firestore');
  return onSnapshot(
    query(collection(firestore, path), ...constraints),
    (snapshot) =>
      onData(snapshot.docs.map((item) => Object.assign({}, item.data(), { id: item.id }) as T)),
    onError,
  );
}

export const watchUsers = (
  onData: (items: UserDocument[]) => void,
  onError: (error: Error) => void,
) => subscribeTo<UserDocument>('users', [orderBy('createdAt', 'desc'), limit(100)], onData, onError);

export const watchCatalog = (
  collectionName: CatalogCollection,
  status: string,
  onData: (items: TrackDocument[]) => void,
  onError: (error: Error) => void,
) => {
  const filters = status === 'all' ? [] : [where('status', '==', status)];
  return subscribeTo<TrackDocument>(
    collectionName,
    [...filters, orderBy(collectionName === 'artists' ? 'name' : 'title'), limit(100)],
    onData,
    onError,
  );
};

export const watchMostPlayed = (
  onData: (items: TrackDocument[]) => void,
  onError: (error: Error) => void,
) => subscribeTo<TrackDocument>('tracks', [orderBy('playCount', 'desc'), limit(8)], onData, onError);

export const watchAnalytics = (
  onData: (items: AnalyticsDocument[]) => void,
  onError: (error: Error) => void,
  range = '30d',
) => {
  if (range === '24h') {
    const since = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    return subscribeTo<AnalyticsDocument>(
      'analytics_hourly',
      [where('timestamp', '>=', since), orderBy('timestamp', 'desc'), limit(24)],
      onData,
      onError,
    );
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 1000;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const constraints =
    range === 'all_time'
      ? [orderBy('date', 'desc'), limit(1000)]
      : [where('date', '>=', since), orderBy('date', 'desc'), limit(days)];
  return subscribeTo<AnalyticsDocument>('analytics_daily', constraints, onData, onError);
};

export const watchLiveMetrics = (
  onData: (item: AnalyticsDocument | null) => void,
  onError: (error: Error) => void,
) => {
  const firestore = requireService(db, 'Firestore');
  return onSnapshot(
    doc(firestore, 'analytics_live', 'global'),
    (snapshot) => onData(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as AnalyticsDocument) : null),
    onError,
  );
};

export const watchAuditLogs = (
  severity: string,
  action: string,
  onData: (items: AuditLogDocument[]) => void,
  onError: (error: Error) => void,
) => {
  const filters = [
    ...(severity === 'all' ? [] : [where('severity', '==', severity)]),
    ...(action === 'all' ? [] : [where('action', '==', action)]),
  ];
  return subscribeTo<AuditLogDocument>(
    'audit_logs',
    [...filters, orderBy('timestamp', 'desc'), limit(100)],
    onData,
    onError,
  );
};

export async function getCollectionCount(path: string) {
  const firestore = requireService(db, 'Firestore');
  const snapshot = await getCountFromServer(collection(firestore, path));
  return snapshot.data().count;
}

async function callFunction<T, R>(name: string, data: T): Promise<R> {
  const callable = httpsCallable<T, R>(requireService(functions, 'Cloud Functions'), name);
  return (await callable(data)).data;
}

export const setAdminRole = (uid: string, role: AdminRole) =>
  callFunction<{ uid: string; role: AdminRole }, { success: boolean }>('setAdminRole', { uid, role });

export const setUserStatus = (uid: string, status: UserStatus) =>
  callFunction<{ uid: string; status: UserStatus }, { success: boolean }>('setUserStatus', { uid, status });

export const updateContent = (
  id: string,
  status: ContentStatus,
  restrictedRegions: string[],
  collection: CatalogCollection = 'tracks',
) =>
  callFunction<
    { id: string; status: ContentStatus; restrictedRegions: string[]; collection: CatalogCollection },
    { success: boolean }
  >('updateContent', { id, status, restrictedRegions, collection });

export const bootstrapAdmin = () =>
  callFunction<Record<string, never>, { success: boolean }>('bootstrapSuperAdmin', {});

export async function uploadContentAsset(file: File) {
  if (!storage) throw new Error('Firebase Storage is not configured.');
  if (!file.type.startsWith('image/') && !file.type.startsWith('audio/')) {
    throw new Error('Only image and audio files are allowed.');
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const assetRef = ref(storage, `admin-assets/${crypto.randomUUID()}-${safeName}`);
  await uploadBytes(assetRef, file, { contentType: file.type });
  return getDownloadURL(assetRef);
}

export async function deleteContentAsset(url: string) {
  if (!storage) throw new Error('Firebase Storage is not configured.');
  await deleteObject(ref(storage, url));
}
