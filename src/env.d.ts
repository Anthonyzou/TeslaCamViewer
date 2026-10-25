declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, any>;
  export default component;
}

declare module '*.css';

declare global {
  interface FileSystemHandlePermissionDescriptor {
    mode?: 'read' | 'readwrite';
  }

  interface FileSystemHandle {
    queryPermission(
      descriptor?: FileSystemHandlePermissionDescriptor
    ): Promise<PermissionState>;
    requestPermission(
      descriptor?: FileSystemHandlePermissionDescriptor
    ): Promise<PermissionState>;
    isSameEntry(other: FileSystemHandle): Promise<boolean>;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    queryPermission(
      descriptor?: FileSystemHandlePermissionDescriptor
    ): Promise<PermissionState>;
    requestPermission(
      descriptor?: FileSystemHandlePermissionDescriptor
    ): Promise<PermissionState>;
  }

  interface FileSystemSyncAccessHandle {
    close(): void;
    flush(): void;
    getSize(): number;
    read(buffer: ArrayBufferView, options?: { at?: number }): number;
    truncate(newSize: number): void;
    write(buffer: ArrayBufferView, options?: { at?: number }): number;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    createSyncAccessHandle(): Promise<FileSystemSyncAccessHandle>;
    createWritable(options?: any): Promise<WritableStream>;
    getFile(): Promise<File>;
  }

  interface Window {
    i18n?: import('./composables/useI18n').I18n;
    showDirectoryPicker: (options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
      startIn?: string | FileSystemHandle;
    }) => Promise<FileSystemDirectoryHandle>;
    FileSystemObserver?: unknown;
  }
}

export {};
